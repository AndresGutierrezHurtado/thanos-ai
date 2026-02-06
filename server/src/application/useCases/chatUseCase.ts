// Domain
import Chat from "../../domain/entities/chat";
import Message from "../../domain/entities/message";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";
import Identifier from "../../domain/valueObjects/Identifier";
import MessageRole from "../../domain/valueObjects/MessageRole";

// DTOs and Resources
import SendMessageDto from "../ports/dtos/SendMessageDTO";
import { MessageResource, toMessageResource } from "../ports/resources/MessageResource";
import { ChatResource, toChatResource, toChatResourceArray } from "../ports/resources/ChatResource";

// Ports
import IChatRepository from "../ports/repositories/IChatRepository";
import IMessageRepository from "../ports/repositories/IMessageRepository";
import ILlmProvider from "../ports/provider/ILlmProvider";
import ISourceRepository from "../ports/repositories/ISourceRepository";
import IMediaContentRepository from "../ports/repositories/IMediaContentRepository";
import MediaContent from "../../domain/entities/mediaContent";
import MediaContentType from "../../domain/valueObjects/MediaContentType";

export default class ChatUseCase {
    constructor(
        private readonly chatRepository: IChatRepository,
        private readonly messageRepository: IMessageRepository,
        private readonly sourceRepository: ISourceRepository,
        private readonly mediaContentRepository: IMediaContentRepository,
        private readonly llmProvider: ILlmProvider,
    ) {}

    public async getChats(): Promise<ChatResource[]> {
        const chats = await this.chatRepository.findAll();

        return toChatResourceArray(chats);
    }

    public async getChatById(id: string): Promise<ChatResource | null> {
        const chat = await this.chatRepository.findById(new Identifier(id));

        if (!chat) {
            throw new Error("Chat not found");
        }

        return toChatResource(chat);
    }

    public async createChat(
        dto: SendMessageDto,
        onChunk?: (text: string) => void,
    ): Promise<MessageResource> {
        const { content, mediaContent } = dto;

        const chat = await this.chatRepository.create(
            new Chat(
                null,
                null,
                await this.llmProvider.generateChatTitle(content),
                new DateTimeValue(),
                new DateTimeValue(),
            ),
        );

        // Save the user message and its file if it exists
        const userMessage = await this.messageRepository.create(
            new Message(
                null,
                chat.getId() as Identifier,
                MessageRole.USER,
                content,
                new DateTimeValue(),
                null,
            ),
        );

        if (mediaContent) {
            // it loads on base64 format
            const mediaContentEntity = new MediaContent(
                null,
                userMessage.getId() as Identifier,
                mediaContent.type as MediaContentType,
                "",
                mediaContent.filename,
                mediaContent.mimeType,
                mediaContent.size,
            );

            await this.mediaContentRepository.create(mediaContentEntity, mediaContent.buffer);
            userMessage.setMediaContent(mediaContentEntity);
        }

        // Generate the assistant message and save it and its sources
        const { message: assistantMessage, sources: retrievedSources } =
            await this.llmProvider.generateResponse(chat, [userMessage], onChunk);
        const savedMessage = await this.messageRepository.create(assistantMessage);

        for (const source of retrievedSources) {
            source.setMessageId(savedMessage.getId() as Identifier);
            const createdSource = await this.sourceRepository.create(source);
            savedMessage.addSource(createdSource);
        }

        return toMessageResource(savedMessage);
    }

    public async deleteChat(id: string): Promise<void> {
        return this.chatRepository.delete(new Identifier(id));
    }
}
