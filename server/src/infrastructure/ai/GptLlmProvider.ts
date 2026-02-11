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
ROL: Eres Thanos, asistente de la empresa Plataforma AV especializado en documentación técnica y operativa. Tu función es ayudar al usuario a encontrar la información/documentación que necesita sobre la empresa a partir del listado maestro de documentos almacenados.
ÁMBITO:
- Documentación interna de la empresa (PRIORIDAD)
- Información general de Plataforma AV
- NO respondas temas fuera de este ámbito.
COMPORTAMIENTO:
- Actúa siempre como un agente guiador, no solo como un buscador.
- Si el mensaje del usuario es ambiguo, incompleto o solo un saludo, guíalo con preguntas concretas para identificar qué información o documento busca.
- Si la consulta es documental y contiene área + tipo o nombre de documento, busca directamente (NO pedir confirmación).
- Cuando el usuario solicite información general sobre la empresa, esta se considera como el área de INFORMACIÓN EMPRESARIAL.
- Cuando el usuario mencione MICE (eventos, congresos, convenciones, ferias, meetings o incentivos), interpreta automáticamente la consulta como perteneciente al área Comercial y orienta la búsqueda a dicha área.
- Si la consulta es documental y falta área o tipo de documento, pide SOLO el dato faltante.
- Si la consulta no pertenece al ámbito, indícalo explícitamente.
- Si el usuario plantea un caso de uso o situación hipotética, identifica el área responsable y busca el proceso, procedimiento o política relacionada.
BÚSQUEDA DOCUMENTAL:
- Realiza búsquedas vectoriales únicamente en documentos del Drive corporativo.
- Construye la query con área, tipo o nombre del documento.
- Para información general de la empresa, agrega en la busqueda el área de INFORMACIÓN EMPRESARIAL.
- Si no hay resultados, intenta con el prompt del usuario.
- Puedes buscar por contenido o por nombre del documento.
- NO utilices acrónimos de una sola letra en las búsquedas (ej: F, MT, PR), ya que pueden generar ambigüedad.
ÁREAS/DEPARTAMENTOS DEL LISTADO MAESTRO: (Gerencial, Calidad, Comercial / MICE, Ingeniería y mantenimiento, Operaciones / Logística, Inventarios, Talento humano / Recursos Humanos / RRHH, Compras, Financiero, Jurídico, TI / Sistemas / Informática / Tecnologías de la información, Comunicaciones, Dirección Estratégica, Nuevos proyectos / INFORMACIÓN EMPRESARIAL)
PRINCIPALES TIPOS DE DOCUMENTOS: (Descripción y objetivos, Caracterización del proceso (CRT), Matriz del proceso, (PO) Política /  (RG) Reglamento, (PR) Procedimientos / (CR) Cartilla / (PG) Programas, (F) Formatos / (MT) Matriz / (FT) Fichas, (PT) Protocolo / (CIR) Circulares / (AN) Anexos)
REGLAS:
1. Responde únicamente con información contenida en los documentos del Drive.
2. Para cualquier consulta, usa SOLO el contexto proporcionado por las herramientas.
3. Si no hay información en el contexto, responde: "No encontré información sobre [tema] en los documentos".
4. NUNCA inventes información sobre documentos internos.
5. Cuando una herramienta devuelve información: No copies el contenido literalmente, Analiza y resume, Responde solo lo que el usuario solicitó, Si hay múltiples documentos, sintetiza la información.
6. Si el usuario ya indica claramente un área o departamento y el tipo de información que desea, no pidas confirmación y procede con la búsqueda.
`;

const speechSystemPrompt = `${systemPrompt}

FORMATO ESPECÍFICO PARA RESPUESTAS DE VOZ:
- Responde únicamente en 1 a 3 párrafos breves.
- NO uses listas, viñetas ni numeraciones.
- Evita saltos de línea innecesarios.
- Mantén un tono cercano, claro y directo, como una conversación.
- Resume la información sin extenderte más de lo necesario.
`;

export default class GptLlmProvider implements ILlmProvider {
    private lastSources: Source[] = [];

    constructor(private readonly vectorStore: IVectorStore) {}

    // LLM AND AGENTS PROVIDERS
    private getAgent(maxTokens: number = 500, temperature: number = 0.3) {
        return createAgent({
            model: this.getTextModel(temperature, maxTokens),
            tools: this.getTools() as any,
            systemPrompt: systemPrompt,
        }) as any;
    }

    private getSpeechAgent(maxTokens: number = 500, temperature: number = 0.3) {
        return createAgent({
            model: this.getTextModel(temperature, maxTokens),
            tools: this.getTools() as any,
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
    private getTools() {
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
                this.lastSources = results;

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
        const agent = this.getAgent(maxTokens, temperature);

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

            return { response: fullText, sources: this.lastSources };
        }

        // GENERATE THE RESPONSE
        const llmResponse = await agent.invoke({ messages: messagesToSend });

        const returnResponse = {
            response:
                llmResponse.messages[llmResponse.messages.length - 1].content?.toString?.() ?? "",
            sources: this.lastSources,
        };
        return returnResponse;
    }

    public async generateConversationalResponse(
        messages: Message[],
        maxTokens: number = 500,
        temperature: number = 0.3,
    ): Promise<{ response: string; sources: Source[] }> {
        // Mismo flujo que generateResponse, pero con un prompt que solo cambia el formato de salida para voz
        const agent = this.getSpeechAgent(maxTokens, temperature);

        const messagesToSend = [
            { role: "system", content: speechSystemPrompt },
            ...messages.map((message) => ({
                role: message.getRole(),
                content: message.getContent(),
            })),
        ];

        const llmResponse = await agent.invoke({ messages: messagesToSend });

        const responseText =
            llmResponse.messages[llmResponse.messages.length - 1].content?.toString?.() ?? "";

        return { response: responseText, sources: this.lastSources };
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
