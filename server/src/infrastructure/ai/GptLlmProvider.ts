import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { createAgent, tool } from "langchain";
import OpenAI from "openai";
import { z } from "zod";

// APPLICATION
import ILlmProvider from "../../application/ports/services/ILlmProvider";
import IVectorStore from "../../application/ports/services/IVectorStore";

// DOMAIN
import Message from "../../domain/entities/message";
import Source from "../../domain/entities/source";

const systemPrompt = `
ROL: Eres Thanos, asistente especializado en documentación de Plataforma AV. Ayudas a los usuarios a encontrar información/documentos en el listado maestro de documentos corporativos.

ÁMBITO:
- Documentación interna de la empresa (PRIORIDAD)
- Información general de Plataforma AV
- NO respondas temas fuera de este ámbito.

COMPORTAMIENTO:
- Actúa siempre como un agente guiador, no solo como un buscador.
- Si el mensaje del usuario es ambiguo, incompleto o solo un saludo, guíalo con preguntas concretas para identificar qué documento busca.
- Si para la búsqueda falta área o tipo de documento, pide SOLO el dato faltante.
- Si la consulta tiene área + tipo o nombre de documento → busca directamente (sin pedir confirmación)
- Para información general de la empresa, usa el área "INFORMACIÓN EMPRESARIAL"
- Si la consulta no pertenece al ámbito, indícalo explícitamente.

BÚSQUEDA DOCUMENTAL:
- Busca solo en el listado maestro de documentos corporativos.
- Puedes buscar por contenido o por nombre del documento (no abreviaturas).
- Construye la query con área, tipo o nombre del documento.
- Si no hay resultados, intenta con el prompt del usuario.

ÁREAS/DEPARTAMENTOS DEL LISTADO MAESTRO: (Gerencial, Calidad, Comercial/MICE, Ingeniería y mantenimiento, Operaciones/Logística, Inventarios, Talento humano/Recursos Humanos/RRHH, Compras, Financiero, Jurídico, Tecnologías de la información/I.T/TI/T.I/Sistemas/Informática, Comunicaciones, Dirección Estratégica, Nuevos proyectos/INFORMACIÓN EMPRESARIAL)

PRINCIPALES TIPOS DE DOCUMENTOS: (Descripción y objetivos, Caracterización del proceso (CRT), Matriz del proceso, (PO) Política/(RG) Reglamento, (PR) Procedimientos/(CR) Cartilla/(PG) Programas, (F) FORMATOS/(MT) MATRIZ/(FT) FICHAS, (PT) PROTOCOLOS/(CIR) CIRCULARES/(AN) ANEXOS)

REGLAS:
1. Responde únicamente con información contenida en los documentos del Drive.
2. Para cualquier consulta, usa SOLO el contexto proporcionado por las herramientas.
3. Si no hay información en el contexto, responde: "No encontré información sobre [tema] en los documentos".
4. NUNCA inventes información sobre documentos internos.
5. Cuando una herramienta devuelve información: No copies el contenido literalmente, Analiza y resume, Responde solo lo que el usuario solicitó, Si hay múltiples documentos, sintetiza la información.
6. Si el usuario ya indica claramente un área o departamento y el tipo de información que desea, no pidas confirmación y procede con la búsqueda.
`;

const speechSystemPrompt = `${systemPrompt}
FORMATO RESPUESTA:
- 1 a 3 párrafos breves
- Sin listas ni numeraciones
- Mantén un tono cercano, claro y directo, como una conversación
- Sin extenderse innecesariamente
`;

export default class GptLlmProvider implements ILlmProvider {
    constructor(private readonly vectorStore: IVectorStore) {}

    // LLM AND AGENTS PROVIDERS
    private getAgent(sources: Source[], maxTokens: number = 500, temperature: number = 0.3) {
        return createAgent({
            model: this.getTextModel(temperature, maxTokens),
            tools: this.getTools(sources) as any,
            systemPrompt: systemPrompt,
        }) as any;
    }

    private getSpeechAgent(sources: Source[], maxTokens: number = 500, temperature: number = 0.3) {
        return createAgent({
            model: this.getTextModel(temperature, maxTokens),
            tools: this.getTools(sources) as any,
            systemPrompt: speechSystemPrompt,
        }) as any;
    }

    private getTextModel(temperature: number = 0.3, maxTokens: number = 500) {
        return new ChatOpenAI({
            model: "gpt-4o-mini",
            apiKey: process.env.OPENAI_API_KEY,
            topP: 1,
            temperature,
            maxTokens,
        });
    }

    // TOOLS PROVIDERS
    private getTools(sources: Source[]) {
        const searchDocumentsSchema = z.object({
            query: z
                .string()
                .describe(
                    "La consulta para buscar información en los documentos internos de la empresa",
                ),
            limit: z.number().optional().default(5).describe("El límite de documentos a buscar"),
        });

        const search = tool(
            async ({ query, limit = 5 }) => {
                const results = await this.vectorStore.query("iso-docs", query, limit);
                sources.push(...results);

                let context = "CONTEXTO RELEVANTE DE LOS DOCUMENTOS:\n";

                for (const result of results) {
                    const url = result.getDocument()
                        ? `https://drive.google.com/file/d/${result.getDocument()?.getDriveId()}/view`
                        : null;
                    context += `- '${result.getDocument()?.getPath()}' (${url}): ${result.getContent()}\n`;
                }

                return context;
            },
            {
                name: "search_documents",
                description: "Busca información en los documentos internos de la empresa",
                schema: searchDocumentsSchema as any,
            },
        );

        return [search];
    }

    // MAIN METHODS
    public async generateResponse(
        messages: Message[],
        maxTokens: number = 500,
        temperature: number = 0.3,
        extractedText?: string,
        onChunk?: (text: string) => void,
    ): Promise<{ response: string; sources: Source[] }> {
        const sources = [] as Source[];
        const agent = this.getAgent(sources, maxTokens, temperature);

        // GENERATE THE MESSAGES THAT THE LLM WILL RESPOND
        const messagesToSend = [
            { role: "system", content: systemPrompt },
            ...messages.map((message) => ({
                role: message.getRole(),
                content: message.getContent(),
            })),
        ];

        if (extractedText) {
            const lastUserIdx = [...messagesToSend].reverse().findIndex((m) => m.role === "user");
            const idx = lastUserIdx >= 0 ? messagesToSend.length - 1 - lastUserIdx : messagesToSend.length - 1;
            const target = messagesToSend[idx];
            if (target && typeof target.content === "string") {
                target.content += `\n\nCONTENIDO DEL ARCHIVO ADJUNTO:\n${extractedText}`;
            }
        }

        // GENERATE THE RESPONSE WITH STREAMING
        if (onChunk) {
            let fullText = "";
            const stream = await agent.stream(
                { messages: messagesToSend },
                { streamMode: "messages" },
            );

            for await (const [token, metadata] of stream) {
                if (metadata.langgraph_node !== "model_request") continue;
                const text = token.content?.toString?.() ?? "";

                if (text) {
                    onChunk(text);
                    fullText += text;
                }
            }

            return { response: fullText, sources: sources };
        }

        // GENERATE THE RESPONSE
        const llmResponse = await agent.invoke({ messages: messagesToSend });

        const returnResponse = {
            response:
                llmResponse.messages[llmResponse.messages.length - 1].content?.toString?.() ?? "",
            sources: sources,
        };
        return returnResponse;
    }

    public async generateConversationalResponse(
        messages: Message[],
        maxTokens: number = 500,
        temperature: number = 0.3,
    ): Promise<{ response: string; sources: Source[] }> {
        // GENERATE THE SOURCES
        const sources = [] as Source[];

        // CREATE THE AGENT
        const agent = this.getSpeechAgent(sources, maxTokens, temperature);

        // GENERATE THE MESSAGES TO SEND
        const messagesToSend = [
            { role: "system", content: speechSystemPrompt },
            ...messages.map((message) => ({
                role: message.getRole(),
                content: message.getContent(),
            })),
        ];

        // GENERATE THE RESPONSE
        const llmResponse = await agent.invoke({ messages: messagesToSend });

        const responseText =
            llmResponse.messages[llmResponse.messages.length - 1].content?.toString?.() ?? "";

        // RETURN THE RESPONSE
        return { response: responseText, sources: sources };
    }

    public async generateSimpleResponse(message: string): Promise<string> {
        const textModel = this.getTextModel();

        const response = await textModel.invoke([
            new SystemMessage("responde lo mas breve posible"),
            new HumanMessage(message),
        ]);

        const text = response.content?.toString() ?? "";

        return text;
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
            voice: "echo",
            input: text,
        });
        return Buffer.from(await response.arrayBuffer());
    }
}
