import { ChatOpenAI } from "@langchain/openai";
import Message from "../../domain/entities/message";

export default class OpenAiModel {
    private model: ChatOpenAI;
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
            maxTokens: 400,
            topP: 1,
        });
    }

    public async generateResponse(messages: Message[], context?: string): Promise<string> {
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

        const response = await this.model.invoke(conversation);
        return response.content.toString();
    }

    private buildSystemPromptWithContext(context: string): string {
        return `CONTEXTO RELEVANTE DE LOS DOCUMENTOS:\n${context}\n---\n${this.systemPrompt}`;
    }
}
