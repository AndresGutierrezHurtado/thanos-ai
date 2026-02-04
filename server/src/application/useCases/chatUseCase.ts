// Domain
import Chat from "../../domain/entities/chat";
import Message from "../../domain/entities/message";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";
import Identifier from "../../domain/valueObjects/Identifier";
import MessageRole from "../../domain/valueObjects/MessageRole";

// DTOs and Resources
import SendMessageDto from "../dtos/SendMessageDTO";
import { MessageResource, toMessageResource } from "../resources/MessageResource";
import { ChatResource, toChatResource } from "../resources/ChatResource";

// Ports
import IChatRepository from "../ports/repositories/IChatRepository";
import IMessageRepository from "../ports/repositories/IMessageRepository";
import ILlmProvider from "../ports/provider/ILlmProvider";
import ISourceRepository from "../ports/repositories/ISourceRepository";

export default class ChatUseCase {
    constructor(
        private readonly chatRepository: IChatRepository,
        private readonly messageRepository: IMessageRepository,
        private readonly sourceRepository: ISourceRepository,
        private readonly llmProvider: ILlmProvider
    ) {}

    public async getChats(): Promise<ChatResource[]> {
        const chats = await this.chatRepository.findAll();

        return chats.map((chat) => ({
            id: chat.getId()?.getValue() ?? "",
            userId: chat.getUserId()?.getValue() ?? "",
            title: chat.getTitle(),
            createdAt: chat.getCreatedAt().getValue(),
            updatedAt: chat.getUpdatedAt().getValue(),
        }));
    }

    public async getChatById(id: string): Promise<ChatResource | null> {
        const chat = await this.chatRepository.findById(new Identifier(id));

        if (!chat) {
            throw new Error("Chat not found");
        }

        return toChatResource(chat);
    }

    public async createChat(dto: SendMessageDto): Promise<MessageResource> {
        const { content, mediaContent } = dto;

        const chat = await this.chatRepository.create(
            new Chat(
                null,
                null,
                await this.llmProvider.generateChatTitle(content),
                new DateTimeValue(),
                new DateTimeValue()
            )
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

        // Generate the assistant message and save it and its sources
        let { message: assistantMessage, sources: retrievedSources } =
            await this.llmProvider.generateResponse(chat, [userMessage]);
        assistantMessage = await this.messageRepository.create(assistantMessage);

        for (const source of retrievedSources) {
            source.setMessageId(assistantMessage.getId() as Identifier);
            await this.sourceRepository.create(source);
        }

        return toMessageResource(assistantMessage, retrievedSources);
    }

    public async deleteChat(id: string): Promise<void> {
        return this.chatRepository.delete(new Identifier(id));
    }
}
