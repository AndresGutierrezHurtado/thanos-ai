// Domain
import Chat from "../../domain/entities/chat";
import Message from "../../domain/entities/message";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";
import Identifier from "../../domain/valueObjects/Identifier";
import MessageRole from "../../domain/valueObjects/MessageRole";
import { MessageResponseDto, SendMessageDto } from "../dtos/SendMessageDTO";

// Ports
import IChatRepository from "../ports/repositories/IChatRepository";
import IMessageRepository from "../ports/repositories/IMessageRepository";
import ILlmProvider from "../ports/provider/ILlmProvider";

export default class ChatUseCase {
    constructor(
        private readonly chatRepository: IChatRepository,
        private readonly messageRepository: IMessageRepository,
        private readonly llmProvider: ILlmProvider,
    ) {}

    public async getChats(): Promise<Chat[]> {
        return this.chatRepository.findAll();
    }

    public async getChatById(id: string): Promise<Chat | null> {
        return this.chatRepository.findById(new Identifier(id));
    }

    public async createChat(dto: SendMessageDto): Promise<MessageResponseDto> {
        const { chatId, content, mediaContent } = dto;

        const chat = await this.chatRepository.create(
            new Chat(null, null, "New Chat", new DateTimeValue(), new DateTimeValue())
        );

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

    public async deleteChat(id: string): Promise<void> {
        return this.chatRepository.delete(new Identifier(id));
    }
}