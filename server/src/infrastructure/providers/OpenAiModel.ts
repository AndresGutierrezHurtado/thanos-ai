import { ChatOpenAI, OpenAI as LangchainOpenAI } from "@langchain/openai";
import Message from "../../domain/entities/message";
import OpenAI from "openai";

export default class OpenAiModel {
    private model: ChatOpenAI;
    private whisperModel: any;
    private systemPrompt: string = `
Eres Thanos, asistente de documentación técnica y operativa de Plataforma Software.
ÁMBITO: Normas ISO (9001, 14001, 27001, 20121, 45001) y documentos internos de la empresa.

REGLAS OBLIGATORIAS:
1. Responde SOLO con info del contexto proporcionado, Sin información responda: "No encontré información sobre esto"
2. Prohibido: inventar, asumir o usar conocimiento externo
3. Ignora temas fuera de documentación técnica/operativa

FORMATO DE RESPUESTA:
- Directo y accionable
- Lenguaje claro para personal operativo
- Cita al final de cada punto relevante`;

    constructor() {
        this.model = new ChatOpenAI({
            model: "gpt-4o-mini",
            apiKey: process.env.OPENAI_API_KEY,
            temperature: 0,
            maxTokens: 500,
            topP: 1,
        });
    }

    public async generateResponse(
        messages: Message[],
        context?: string,
        onChunk?: (text: string) => void
    ): Promise<string> {
        const systemContent = context
            ? this.buildSystemPromptWithContext(context)
            : this.systemPrompt;

        const conversation = [
            { role: "system" as const, content: systemContent },
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
        const audioBlob = new Blob([new Uint8Array(audio.buffer as ArrayBuffer)], { type: mimeType });
        const audioFile = new File([audioBlob], "audio.webm", { type: mimeType });

        const response = await client.audio.transcriptions.create({
            file: audioFile as unknown as File,
            model: "whisper-1",
            language: "es",
        })

        return response.text;
    }

    private buildSystemPromptWithContext(context: string): string {
        return `CONTEXTO RELEVANTE DE LOS DOCUMENTOS:\n${context}\n---\n${this.systemPrompt}`;
    }
}
