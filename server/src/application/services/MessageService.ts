// DOMAIN
import Message from "../../domain/entities/message";
import Chat from "../../domain/entities/chat";
import Identifier from "../../domain/valueObjects/Identifier";
import MessageRole from "../../domain/valueObjects/MessageRole";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";

// PORTS
import ILlmProvider from "../ports/services/ILlmProvider";
import IMessageRepository from "../ports/repositories/IMessageRepository";
import ISourceRepository from "../ports/repositories/ISourceRepository";


export default class MessageService {
    constructor(
        private readonly llmProvider: ILlmProvider,
        private readonly messageRepository: IMessageRepository,
        private readonly sourceRepository: ISourceRepository,
    ) {}

    async generateResponse(
        chat: Chat,
        messages: Message[],
        onChunk?: (text: string) => void,
    ): Promise<Chat> {
        // Generate the AI response
        const { response: llmResponse, sources } = await this.llmProvider.generateResponse(
            messages,
            500,
            0.3,
            onChunk,
        );

        const assistantMessage = await this.messageRepository.create(
            new Message(
                null,
                chat.getId() as Identifier,
                MessageRole.ASSISTANT,
                llmResponse,
                new DateTimeValue(),
                null,
            ),
        );

        for (const source of sources) {
            source.setMessageId(assistantMessage.getId() as Identifier);
            await this.sourceRepository.create(source);
        }

        chat.addMessage(assistantMessage);

        return chat;
    }

    async generateTitle(content: string): Promise<string> {
        return await this.llmProvider.generateSimpleResponse(`Genera un titulo corto y descriptivo para basado en lo siguiente: ${content}`);
    }
}
