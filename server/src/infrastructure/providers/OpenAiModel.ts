import { ChatOpenAI, OpenAI as LangchainOpenAI } from "@langchain/openai";
import { DynamicTool } from "@langchain/core/tools";
import Message from "../../domain/entities/message";
import OpenAI from "openai";

export default class OpenAiModel {
    private simpleModel: ChatOpenAI;
    private model: ChatOpenAI;
    private systemPrompt: string = `
Eres Thanos, asistente de la empresa Plataforma Software y Plataforma AV especializado en documentación técnica y operativa.
ÁMBITO:
- Documentación interna de la empresa (PRIORIDAD)
- Consultas generales sobre grupo plataforma
- Gestión documental general
REGLAS:
1. Para consultas de documentación interna: Usa SOLO el CONTEXTO proporcionado
2. Para consultas generales de AV o gestión documental: Puedes usar conocimiento general
3. Si no hay información en el contexto: "No encontré información sobre [tema] en los documentos"
4. NUNCA inventes información sobre documentos internos
FORMATO: Respuestas directas, usa listas cuando ayude a la claridad.
`;

    constructor() {
        this.model = new ChatOpenAI({
            model: "gpt-4o-mini",
            apiKey: process.env.OPENAI_API_KEY,
            temperature: 0.5,
            maxTokens: 500,
            topP: 1,
        });
        this.simpleModel = new ChatOpenAI({
            model: "gpt-4o-mini",
            apiKey: process.env.OPENAI_API_KEY,
            temperature: 0,
            maxTokens: 150,
        });
    }

    public async generateResponse(
        messages: Message[],
        context?: string,
        documentText?: string | null,
        onChunk?: (text: string) => void
    ): Promise<string> {
        const hasContext = context && context.trim().length > 0;
        let systemPrompt = hasContext
            ? this.buildSystemPromptWithContext(context)
            : this.systemPrompt;

        if (documentText) {
            systemPrompt += `\n\nDOCUMENTO CARGADO POR EL USUARIO:\n${documentText}`;
        }

        const conversation = [
            { role: "system" as const, content: systemPrompt },
            ...messages.map((message) => ({
                role: message.getRole() as "user" | "assistant",
                content: message.getContent(),
            })),
        ];

        if (onChunk) {
            let fullText = "";
            const stream = await this.model.stream(conversation);
            for await (const chunk of stream) {
                const text = chunk.content?.toString?.() ?? "";
                if (text) {
                    onChunk(text);
                    fullText += text;
                }
            }
            return fullText;
        }

        const response = await this.model.invoke(conversation);
        return response.content.toString();
    }

    public async generateSimpleResponse(
        messages: Message[],
        context?: string,
        documentText?: string | null
    ): Promise<string> {
        const hasContext = context && context.trim().length > 0;
        let systemPrompt = hasContext
            ? this.buildSystemPromptWithContext(context)
            : this.systemPrompt;
        systemPrompt += "\nResponde de forma MUY BREVE (1-2 frases).";
        if (documentText) {
            systemPrompt += `\n\nDOCUMENTO CARGADO POR EL USUARIO:\n${documentText}`;
        }

        const conversation = [
            { role: "system" as const, content: systemPrompt },
            ...messages.map((message) => ({
                role: message.getRole() as "user" | "assistant",
                content: message.getContent(),
            })),
        ];

        const response = await this.simpleModel.invoke(conversation);
        return response.content.toString();
    }

    public async generateChatTitle(content: string): Promise<string> {
        const response = await this.model.invoke([
            {
                role: "system" as const,
                content:
                    "Genera un titulo corto y descriptivo para la conversación segun el contenido de la conversación",
            },
            { role: "user" as const, content: content },
        ]);
        return response.content.toString();
    }

    public async speechToText(audio: Buffer): Promise<string> {
        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const mimeType = "audio/webm";
        const audioBlob = new Blob([new Uint8Array(audio.buffer as ArrayBuffer)], {
            type: mimeType,
        });
        const audioFile = new File([audioBlob], "audio.webm", { type: mimeType });

        const response = await client.audio.transcriptions.create({
            file: audioFile as unknown as File,
            model: "whisper-1",
            language: "es",
        });

        return response.text;
    }

    public async textToSpeech(text: string): Promise<Buffer> {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await client.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: text,
        });
        return Buffer.from(await response.arrayBuffer());
    }

    public async imageToText(image: Buffer, mimeType: string): Promise<string> {
        const base64Image = image.toString("base64");
        const dataUrl = `data:${mimeType};base64,${base64Image}`;

        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Extrae todo el texto visible en esta imagen. Devuelve solo el texto extraído, sin comentarios adicionales. Si la imagen contiene tablas, preserva su estructura.",
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: dataUrl,
                            },
                        },
                    ],
                },
            ],
        });

        return response.choices[0]?.message?.content ?? "";
    }

    private buildSystemPromptWithContext(context: string): string {
        return `CONTEXTO RELEVANTE DE LOS DOCUMENTOS:\n${context}\n---\n${this.systemPrompt}`;
    }

    public getTools() {
        const getPlatformInformation = new DynamicTool({
            name: "get_platform_information",
            description: "Get information about Plataforma Software and Plataforma AV",
            func: async () => {
                return `Plataforma AV es una empresa colombiana dedicada a la **producción audiovisual para eventos** y logística tecnológica especializada en la industria hotelera y de convenciones. Con casi tres décadas de trayectoria, ofrece servicios integrales para congresos, convenciones y eventos corporativos o sociales. Plataforma Software de Colombia S.A.S. es la división de desarrollo de software del **Grupo Plataforma**, fundado en 1996 en Cali (Colombia) como empresa de servicios para eventos. La visión de la compañía es “revolucionar la gestión de propiedades con soluciones digitales de última tecnología”. En este sentido, su misión es “aumentar la productividad en las áreas que nuestros clientes requieran a través de diferentes soluciones”.`;
            },
        });

        const getGeneralDocumentsInformation = new DynamicTool({
            name: "get_general_documents_information",
            description: "Get general information about documents",
            func: async () => {
                return `Cubres información general sobre los documentos disponibles en la base de datos que abarcan: Gerencial, Calidad, Operaciones/Logística, Inventarios, Ingeniería y Mantenimiento, Compras, Talento Humano, Contraloría y Financiero, Jurídico, Comercial, T.I, Comunicaciones, Nuevos Proyectos, Dirección Estratégica, Información Empresarial.`;
            },
        });

        return [getPlatformInformation, getGeneralDocumentsInformation];
    }
}
