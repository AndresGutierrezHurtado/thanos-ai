import IChatRepository from "../ports/repositories/IChatRepository";
import IMessageRepository from "../ports/repositories/IMessageRepository";
import ILlmProvider from "../ports/provider/ILlmProvider";

// DTOs
import { SendMessageDto, MessageResponseDto } from "../dtos/SendMessageDTO";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";
import Identifier from "../../domain/valueObjects/Identifier";
import Message from "../../domain/entities/message";
import MessageRole from "../../domain/valueObjects/MessageRole";

export default class MessageUseCase {
    constructor(
        private readonly chatRepository: IChatRepository,
        private readonly messageRepository: IMessageRepository,
        private readonly llmProvider: ILlmProvider
    ) {}

    public async sendMessage(messageDto: SendMessageDto): Promise<MessageResponseDto> {
        const { chatId, content, mediaContent } = messageDto;

        // Find the chat
        const chat = await this.chatRepository.findById(new Identifier(chatId as string));
        if (!chat) throw new Error("Chat not found");

        // Save the user message
        const userMessage = await this.messageRepository.create(
            new Message(
                null,
                chat.getId() as Identifier,
                MessageRole.USER,
                content,
                null,
                new DateTimeValue(),
                null
            )
        );

        // Generate the assistant message and save it
        const assistantMessageResponse = await this.llmProvider.generateResponse([userMessage]);
        const assistantMessage = await this.messageRepository.create(assistantMessageResponse);

        // Return the response
        return {
            chatId: chat.getId(),
            messageId: userMessage.getId(),
            assistantMessage: {
                content: assistantMessage.getContent(),
                timestamp: assistantMessage.getTimestamp().getValue(),
                sources: null,
            },
        };
    }
}
