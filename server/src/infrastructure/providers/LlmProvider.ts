// Application
import ILlmProvider, {
    type GenerateResponseResult,
    type RetrieveSource,
} from "../../application/ports/provider/ILlmProvider";
import { DOCUMENTS_COLLECTION } from "../../application/constants/collections";

// Domain
import Chat from "../../domain/entities/chat";
import Message from "../../domain/entities/message";
import MessageRole from "../../domain/valueObjects/MessageRole";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";
import Identifier from "../../domain/valueObjects/Identifier";

// Ports
import IVectorStore from "../../application/ports/services/IVectorStore";

// Providers
import OpenAiModel from "./OpenAiModel";

const NO_CONTEXT_RESPONSE = "No encontré información sobre esto en los documentos disponibles.";

export default class LlmProvider implements ILlmProvider {
    constructor(
        private readonly openAiModel: OpenAiModel,
        private readonly vectorStore: IVectorStore
    ) {}

    public async generateChatTitle(content: string): Promise<string> {
        const title = await this.openAiModel.generateChatTitle(content);
        return title.replaceAll('"', "").trim();
    }

    // FUNCION FOR GENERATING THE RESPONSE WITH THE CONTEXT OF THE DOCUMENTS
    public async generateResponse(
        chat: Chat,
        messages: Message[],
        onChunk?: (text: string) => void
    ): Promise<GenerateResponseResult> {
        const lastUserContent = this.getLastUserMessageContent(messages);
        const { context, sources } = await this.retrieveContext(lastUserContent);

        const responseContent =
            context.length > 0
                ? await this.openAiModel.generateResponse(messages, context, onChunk)
                : NO_CONTEXT_RESPONSE;

        // Save the response
        const message = new Message(
            null,
            chat.getId() as Identifier,
            MessageRole.ASSISTANT,
            responseContent,
            null,
            new DateTimeValue(),
            null
        );

        return { message, sources };
    }

    // FUNCION FOR GETTING THE LAST USER MESSAGE CONTENT
    private getLastUserMessageContent(messages: Message[]): string {
        const userMessages = messages.filter((m) => m.getRole() === MessageRole.USER);
        const last = userMessages[userMessages.length - 1];
        return last?.getContent()?.trim() ?? "";
    }

    // FUNCION FOR RETRIEVING THE CONTEXT OF THE DOCUMENTS
    private async retrieveContext(queryText: string): Promise<{
        context: string;
        sources: RetrieveSource[];
    }> {
        if (!queryText) {
            return { context: "", sources: [] };
        }

        const results = await this.vectorStore.query(DOCUMENTS_COLLECTION, queryText, 10);

        const context = results
            .map((r) => r.document)
            .filter(Boolean)
            .join("\n\n---\n\n");

        const sources: RetrieveSource[] = results.map((r) => ({
            section: String(r.metadata.section ?? ""),
            norm: r.metadata.norm != null ? String(r.metadata.norm) : "",
            content: r.document,
        }));

        return { context, sources };
    }

    // FUNCION FOR CONVERTING AUDIO TO TEXT
    public async speechToText(audio: Buffer): Promise<string> {
        return await this.openAiModel.speechToText(audio);
    }
}
