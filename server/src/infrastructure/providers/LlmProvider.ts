// Application
import ILlmProvider from "../../application/ports/provider/ILlmProvider";

// Domain
import Chat from "../../domain/entities/chat";
import Message from "../../domain/entities/message";
import MessageRole from "../../domain/valueObjects/MessageRole";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";
import Identifier from "../../domain/valueObjects/Identifier";

// Providers
import OpenAiModel from "./OpenAiModel";

export default class LlmProvider implements ILlmProvider {
    private openAiModel: OpenAiModel;

    constructor() {
        this.openAiModel = new OpenAiModel();
    }

    public async generateResponse(chat: Chat, messages: Message[]): Promise<Message> {
        // const responseContent = await this.openAiModel.generateResponse(messages);
        const responseContent = "No encontré información sobre esto en los documentos disponibles.";

        const response = new Message(
            null,
            chat.getId() as Identifier,
            MessageRole.ASSISTANT,
            responseContent,
            null,
            new DateTimeValue(),
            null
        );

        return response;
    }
}
