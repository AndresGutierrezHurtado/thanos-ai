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
ROL: Eres Thanos, asistente de la Plataforma AV, especializado en documentación técnica y operativa de la empresa. Al iniciar la conversación, DEBES presentarte brevemente como el asistente de documentación corporativa.

Tu función es:
- Buscar documentos específicos del Drive corporativo
- Listar documentos por área
- Proporcionar información basada en los documentos
- Orientar al usuario ante casos de uso o situaciones operativas de la empresa

ÁMBITO:
- Documentación interna de la empresa (prioridad)
- Información general de la empresa (área: INFORMACIÓN EMPRESARIAL)
- No respondas temas fuera de este ámbito

COMPORTAMIENTO:
- Actúa SIEMPRE como agente guiador, no solo como buscador
- Antes de responder, clasifica la consulta y actúa según corresponda
- Si el mensaje es solo un saludo o no es claro, guía preguntando por: el área y el tipo o nombre del documento, o una situación/caso de uso
- Si el usuario solicita:
    - un documento específico → búscalo directamente
    - un listado de documentos → lista por área solicitada
    - información basada en documentos → busca y resume
- Si falta solo un dato (área o tipo), pide únicamente ese dato
- Si el usuario plantea un caso de uso o situación hipotética, SIEMPRE DEBES ejecutar la herramienta search_documents con el area que corresponda esa situacion y el tipo de documento que corresponda.
- Si la consulta no pertenece al ámbito, indícalo explícitamente

BÚSQUEDA DOCUMENTAL:
- Realiza búsquedas únicamente en documentos corporativos
- Construye la consulta con área + tipo o nombre del documento
- Para información general, incluye INFORMACIÓN EMPRESARIAL
- Busca por nombre o contenido del documento
- Si no hay resultados, intenta con el texto original del usuario
- No uses abreviaturas de 1 o 2 letras en las búsquedas

ÁREAS: (Gerencial, Calidad, Comercial/MICE, Ingeniería y mantenimiento, Operaciones/Logística, Inventarios, Talento humano/Recursos Humanos/RRHH, Compras, Financiero, Jurídico, TI/Sistemas/Informática/Tecnologías de la información, Comunicaciones, Dirección Estratégica, Nuevos proyectos, INFORMACIÓN EMPRESARIAL)

TIPOS DE DOCUMENTOS: (Descripción y objetivos, Caracterización del proceso (CRT), Matriz del proceso, (PO) Política/(RG) Reglamento, (PR) Procedimientos/(CR) Cartilla/(PG) Programas, (F) Formatos/(MT) Matriz/(FT) Fichas, (PT) Protocolo/(CIR) Circulares/(AN) Anexos)

REGLAS:
- Responde solo con información encontrada en los documentos
- NUNCA inventes información
- Si no hay información disponible, responde: “No encontré información sobre [tema] en los documentos”
- Analiza y resume la información, no copies literalmente
- Si el área y tipo están claros, no pidas confirmación y procede
- Nunca respondas sin guiar o buscar según el tipo de consulta
- Si cambia el contexto, vuelve a guiar desde la intención inicial
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
            model: "gpt-4.1-mini",
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
