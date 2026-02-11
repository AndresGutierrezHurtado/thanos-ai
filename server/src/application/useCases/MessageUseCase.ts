// Ports
import IChatRepository from "../ports/repositories/IChatRepository";
import IMessageRepository from "../ports/repositories/IMessageRepository";
import ISourceRepository from "../ports/repositories/ISourceRepository";
import IDocumentRepository from "../ports/repositories/IDocumentRepository";
import IMediaContentRepository from "../ports/repositories/IMediaContentRepository";

// DTOs and Resources
import SendMessageDto from "../ports/dtos/SendMessageDTO";
import UpdateMessageDto from "../ports/dtos/updateMessageDTO";
import { MessageResource, toMessageResource } from "../ports/resources/MessageResource";

// Domain
import Message from "../../domain/entities/message";
import Source from "../../domain/entities/source";
import Document from "../../domain/entities/document";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";
import Identifier from "../../domain/valueObjects/Identifier";
import MessageRole from "../../domain/valueObjects/MessageRole";
import MediaContent from "../../domain/entities/mediaContent";
import { MediaContentType } from "../../domain/valueObjects/MediaContentType";

// Application Services
import MessageService from "../services/MessageService";

export default class MessageUseCase {
    constructor(
        private readonly chatRepository: IChatRepository,
        private readonly messageRepository: IMessageRepository,
        private readonly sourceRepository: ISourceRepository,
        private readonly documentRepository: IDocumentRepository,
        private readonly mediaContentRepository: IMediaContentRepository,
        private readonly messageService: MessageService,
    ) {}

    public async sendMessage(
        messageDto: SendMessageDto,
        onChunk?: (text: string) => void,
    ): Promise<MessageResource> {
        const { chatId, content, mediaContent } = messageDto;

        const chat = await this.chatRepository.findById(new Identifier(chatId as string));
        if (!chat) throw new Error("Chat not found");

        // Save the user message
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

        const messages = await this.messageRepository.findByChatId(chat.getId() as Identifier);

        // Generate the assistant message and save it and its sources
        const aiResponse = await this.messageService.generateResponse(
            chat,
            messages,
            onChunk,
        );

        return toMessageResource(aiResponse.getLastAssistantMessage() as Message);
    }

    public async updateMessage(
        dto: UpdateMessageDto,
        onChunk?: (text: string) => void,
    ): Promise<MessageResource> {
        // Get the message to update
        let message = await this.messageRepository.findById(new Identifier(dto.id));
        if (!message) throw new Error("Message not found");

        const chat = await this.chatRepository.findById(message.getChatId());
        if (!chat) throw new Error("Chat not found");

        // Update the message content and timestamp
        message.setContent(dto.content);
        await this.messageRepository.update(message.getId()!, message);

        await this.messageRepository.deleteByChatIdAfterTimestamp(
            message.getChatId(),
            message.getTimestamp().getValue(),
        );

        // Get the latest messages for the LLM
        const messages = await this.messageRepository.findByChatId(message.getChatId());

        // Generate the assistant message and save it and its sources
        const aiResponse = await this.messageService.generateResponse(
            chat,
            messages,
            onChunk,
        );

        return toMessageResource(aiResponse.getLastAssistantMessage() as Message);
    }

    public async getMessagesByChatId(chatId: string): Promise<MessageResource[]> {
        const messages = await this.messageRepository.findByChatId(new Identifier(chatId));

        const messagesList: MessageResource[] = await Promise.all(
            messages.map(async (message: Message) => {
                const sources = await this.sourceRepository.findByMessageId(
                    message.getId() as Identifier,
                );
                const mediaContent = await this.getMediaContent(message.getId() as Identifier);
                for (const source of sources) {
                    const document = await this.getSourceDocument(source);
                    if (!document) continue;
                    source.setDocument(document);
                }
                message.setSources(sources);
                message.setMediaContent(mediaContent as MediaContent);

                return toMessageResource(message);
            }),
        );

        return messagesList;
    }

    public async getSourceDocument(source: Source): Promise<Document> {
        const document = await this.documentRepository.findById(
            source.getDocumentId() as Identifier,
        );
        return document as Document;
    }

    public async getMediaContent(messageId: Identifier): Promise<MediaContent | null> {
        const mediaContent = await this.mediaContentRepository.findByMessageId(messageId);
        return mediaContent as MediaContent;
    }
}
