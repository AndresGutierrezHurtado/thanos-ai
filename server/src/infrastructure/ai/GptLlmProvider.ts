import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { createAgent, tool } from "langchain";
import { z } from "zod";

// APPLICATION
import ILlmProvider from "../../application/ports/services/ILlmProvider";
import IVectorStore from "../../application/ports/services/IVectorStore";

// DOMAIN
import Message from "../../domain/entities/message";
import Source from "../../domain/entities/source";
import LoggerAdapter from "../services/LoggerAdapter";
import { SyslogSeverity } from "../../application/ports/services/ILogger";

const systemPrompt = `
ROL: Eres Thanos, asistente de la empresa Plataforma Software y Plataforma AV especializado en documentación técnica y operativa.
ÁMBITO:
- Documentación interna de la empresa (PRIORIDAD)
- Consultas generales sobre grupo plataforma
- NO respondas temas fuera de este ámbito.
COMPORTAMIENTO:
- Si la consulta es documental y contiene área + tipo/nombre de documento, busca directamente (NO pedir confirmación).
- Si la consulta es documental y falta área o tipo de documento, pide SOLO el dato faltante.
- Si la consulta es de negocio, responde usando la información de las herramientas.
- Si la consulta no pertenece al ámbito, indícalo explícitamente.
BÚSQUEDA DOCUMENTAL:
- Realiza búsquedas vectoriales en documentos del Drive corporativo.
- Construye la query con área, tipo o nombre de documento.
- Si no hay resultados, intenta con el prompt del usuario.
- Puedes buscar por contenido o por nombre del documento.
ÁREAS DEL SISTEMA DE GESTIÓN: (Gerencial, Calidad, Comercial, Ingeniería y mantenimiento, Operaciones / Logística, Inventarios, Talento humano / Recursos Humanos / RRHH, Compras, Financiero, Jurídico, TI / Sistemas / Informática / Tecnologías de la información, Comunicaciones, Dirección Estratégica, Nuevos proyectos)
TIPOS DE DOCUMENTOS: (Descripción y objetivos, Caracterización del proceso (CRT), Matriz del proceso, (PO) Política /  (RG) Reglamento, (PR) Procedimientos / (CR) Cartilla / (PG) Programas, (F) FORMATOS / (MT) MATRIZ / (FT) FICHAS, (PT) PROTOCOLOS / (CIR) CIRCULARES / (AN) ANEXOS)
REGLAS:
1. No respondas preguntas que no sean sobre la documentación interna de la empresa o el grupo plataforma.
2. Para consultas de documentación interna: Usa SOLO el CONTEXTO proporcionado y el contenido del archivo cargado por el usuario
3. Para consultas generales de AV o gestión documental: Puedes usar conocimiento general
4. Si no hay información en el contexto: "No encontré información sobre [tema] en los documentos"
5. NUNCA inventes información sobre documentos internos
6. uando una herramienta devuelve información: NO copies el contenido literalmente, Analiza la información, Resume, Responde solo lo que el usuario pidió, Si hay múltiples documentos, sintetiza
7. Si el usuario ya indica claramente: un área o departamento, y el tipo de información que desea, no pidas confirmación y procede con la búsqueda.
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

    public async generateSimpleResponse(message: string): Promise<string> {
        const textModel = this.getTextModel();

        const response = await textModel.invoke([
            new SystemMessage("responde lo mas breve posible"),
            new HumanMessage(message),
        ]);

        const text = response.content?.toString() ?? "";
        const normalizedText = text.replace(/```json/g, "").replace(/```/g, "");
        return normalizedText;
    }

    public async speechToText(audio: Buffer): Promise<string> {
        return "";
    }

    public async textToSpeech(text: string): Promise<Buffer> {
        return Buffer.from("");
    }
}
