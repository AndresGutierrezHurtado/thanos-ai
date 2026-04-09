// Domain
import Chat from "../../domain/entities/chat";
import Message from "../../domain/entities/message";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";
import Identifier from "../../domain/valueObjects/Identifier";
import MessageRole from "../../domain/valueObjects/MessageRole";
import MediaContent from "../../domain/entities/mediaContent";
import MediaContentType from "../../domain/valueObjects/MediaContentType";

// DTOs and Resources
import SendMessageDto from "../ports/dtos/SendMessageDTO";
import { MessageResource, toMessageResource } from "../ports/resources/MessageResource";
import { ChatResource, toChatResource, toChatResourceArray } from "../ports/resources/ChatResource";

// Ports
import IChatRepository from "../ports/repositories/IChatRepository";
import IMessageRepository from "../ports/repositories/IMessageRepository";
import IMediaContentRepository from "../ports/repositories/IMediaContentRepository";
import IUserRepository from "../ports/repositories/IUserRepository";

// Application Services
import MessageService from "../services/MessageService";

// Infrastructure
import ProcessorFactory from "../../infrastructure/services/ProcessorFactory";

export default class ChatUseCase {
    constructor(
        private readonly chatRepository: IChatRepository,
        private readonly messageRepository: IMessageRepository,
        private readonly mediaContentRepository: IMediaContentRepository,
        private readonly messageService: MessageService,
        private readonly processorFactory: ProcessorFactory,
        private readonly userRepository: IUserRepository,
    ) {}

    public async getChats(userId?: string): Promise<ChatResource[]> {
        const chats = userId
            ? await this.chatRepository.findByUserId(new Identifier(userId))
            : await this.chatRepository.findAll();

        return toChatResourceArray(chats);
    }

    public async getChatById(id: string, userId?: string): Promise<ChatResource | null> {
        const chat = await this.chatRepository.findById(new Identifier(id));

        if (!chat) {
            throw new Error("Chat not found");
        }
        if (userId && chat.getUserId()?.getValue() !== userId) {
            throw new Error("Chat not found");
        }

        return toChatResource(chat);
    }

    public async createChat(
        dto: SendMessageDto,
        onChunk?: (text: string) => void,
        userId?: string,
    ): Promise<MessageResource> {
        const { content, mediaContent } = dto;

        // Process media content and extract text if exists
        let extractedText: string | undefined;
        if (mediaContent?.buffer && mediaContent?.mimeType) {
            try {
                const processor = this.processorFactory.get(mediaContent.mimeType);
                const extracted = await processor.extract(mediaContent.buffer, mediaContent.mimeType);
                extractedText = extracted?.text;
            } catch {
                extractedText = undefined;
            }
        }

        const userIdentifier = userId ? new Identifier(userId) : null;
        const chat = await this.chatRepository.create(
            new Chat(
                null,
                userIdentifier,
                (await this.messageService.generateTitle(content)).replaceAll("\"", ""),
                new DateTimeValue(),
                new DateTimeValue(),
            ),
        );

        // Save the user message and its file if it exists
        const userMessage = await this.messageRepository.create(
            new Message(
                null,
                chat.getId() as Identifier,
                chat.getUserId(),
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
        let userSystemPrompt: string | null = null;
        if (userId) {
            const user = await this.userRepository.findById(new Identifier(userId));
            userSystemPrompt = user?.getSystemPrompt() || null;
        }

        const aiResponse = await this.messageService.generateResponse(
            chat,
            [userMessage],
            extractedText,
            onChunk,
            userSystemPrompt,
        );

        return toMessageResource(aiResponse.getLastAssistantMessage() as Message);
    }

    public async deleteChat(id: string, userId?: string): Promise<void> {
        if (userId) {
            const chat = await this.chatRepository.findById(new Identifier(id));
            if (!chat || chat.getUserId()?.getValue() !== userId) {
                throw new Error("Chat not found");
            }
        }
        return this.chatRepository.delete(new Identifier(id));
    }
}
