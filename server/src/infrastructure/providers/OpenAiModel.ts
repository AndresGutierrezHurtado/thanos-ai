import { ChatOpenAI } from "@langchain/openai";
import Message from "../../domain/entities/message";

export default class OpenAiModel {
    private model: ChatOpenAI;
    private systemPrompt: string = `
Eres Thanos, asistente especializado en normas ISO (9001, 14001, 27001, 20121, 45001) para el personal de Plataforma Software.
REGLAS ESTRICTAS:
1. Responde SOLO con información del contexto proporcionado
2. Cita siempre norma y sección: [ISO XXXX - Cláusula X.X]
3. Si no hay información en el contexto, responde: "No encontré información sobre esto en los documentos disponibles"
4. Nunca inventes ni asumas información
5. Ignora preguntas fuera del ámbito de normas y procedimientos operativos
FORMATO DE RESPUESTA:
- Directo y accionable
- Cita la fuente al final: "Fuente: [Norma - Sección]"
- Lenguaje claro para personal operativo
Enfócate en QUÉ debe hacer el usuario según las normas.`;

    constructor() {
        this.model = new ChatOpenAI({
            model: "gpt-4o-mini",
            apiKey: process.env.OPENAI_API_KEY,
            temperature: 0.1,
            maxTokens: 400,
            topP: 1,
        });
    }

    public async generateResponse(messages: Message[]): Promise<string> {
        const conversation = [
            {
                role: "system",
                content: this.systemPrompt,
            },
            ...messages.map((message) => ({
                role: message.getRole() as "user" | "assistant",
                content: message.getContent(),
            })),
        ];

        const response = await this.model.invoke(conversation);

        return response.content.toString();
    }
}
