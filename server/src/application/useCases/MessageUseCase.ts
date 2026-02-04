import IChatRepository from "../ports/repositories/IChatRepository";
import IMessageRepository from "../ports/repositories/IMessageRepository";
import ISourceRepository from "../ports/repositories/ISourceRepository";
import ILlmProvider from "../ports/provider/ILlmProvider";

// DTOs
import { SendMessageDto, MessageResponseDto, UpdateMessageDto } from "../dtos/SendMessageDTO";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";
import Identifier from "../../domain/valueObjects/Identifier";
import Message from "../../domain/entities/message";
import MessageRole from "../../domain/valueObjects/MessageRole";
import ILogger from "../ports/services/ILogger";

export default class MessageUseCase {
    constructor(
        private readonly chatRepository: IChatRepository,
        private readonly messageRepository: IMessageRepository,
        private readonly sourceRepository: ISourceRepository,
        private readonly llmProvider: ILlmProvider,
        private readonly logger: ILogger
    ) {}

    public async sendMessage(
        messageDto: SendMessageDto,
        onChunk?: (text: string) => void
    ): Promise<MessageResponseDto> {
        const { chatId, content, mediaContent } = messageDto;

        const chat = await this.chatRepository.findById(new Identifier(chatId as string));
        if (!chat) throw new Error("Chat not found");

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

        const previousMessages = await this.messageRepository.findByChatId(
            chat.getId() as Identifier
        );
        const messagesForLlm = [...previousMessages];

        const { message: assistantMessage, sources } = await this.llmProvider.generateResponse(
            chat,
            messagesForLlm,
            onChunk
        );
        const savedMessage = await this.messageRepository.create(assistantMessage);

        for (const source of sources) {
            source.setMessageId(savedMessage.getId() as Identifier);
            await this.sourceRepository.create(source);
        }

        return {
            chatId: chat.getId()?.getValue() ?? null,
            messageId: userMessage.getId()?.getValue() ?? null,
            role: MessageRole.ASSISTANT,
            timestamp: savedMessage.getTimestamp().getValue(),
            content: {
                text: savedMessage.getContent(),
                sources: sources,
                mediaContent: null,
            },
        };
    }

    public async updateMessage(
        dto: UpdateMessageDto,
        onChunk?: (text: string) => void
    ): Promise<MessageResponseDto> {
        let message = await this.messageRepository.findById(new Identifier(dto.id));
        if (!message) throw new Error("Message not found");

        const chat = await this.chatRepository.findById(message.getChatId());
        if (!chat) throw new Error("Chat not found");

        message.setContent(dto.content);
        await this.messageRepository.update(message.getId()!, message);

        await this.messageRepository.deleteByChatIdAfterTimestamp(
            message.getChatId(),
            message.getTimestamp().getValue()
        );

        const previousMessages = await this.messageRepository.findByChatId(message.getChatId());
        const messagesForLlm = [...previousMessages];

        // Generate the assistant message and save it
        let { message: assistantMessage, sources } = await this.llmProvider.generateResponse(
            chat,
            messagesForLlm,
            onChunk
        );
        assistantMessage = await this.messageRepository.create(assistantMessage);

        // Save the sources
        for (const source of sources) {
            source.setMessageId(assistantMessage.getId() as Identifier);
            await this.sourceRepository.create(source);
        }

        const updatedMessage: MessageResponseDto = {
            chatId: message.getChatId().getValue(),
            messageId: message.getId()?.getValue() ?? null,
            role: message.getRole(),
            timestamp: message.getTimestamp().getValue(),
            content: {
                text: message.getContent(),
                sources: sources,
                mediaContent: null,
            },
        };

        return updatedMessage;
    }

    public async getMessagesByChatId(chatId: string): Promise<MessageResponseDto[]> {
        const messages = await this.messageRepository.findByChatId(new Identifier(chatId));

        const messagesWithSources = await Promise.all(
            messages.map(async (message) => {
                const messageId = message.getId();
                const sources = messageId
                    ? await this.sourceRepository.findByMessageId(messageId)
                    : [];

                this.logger.debug("sources", { sources });
                return {
                    chatId: message.getChatId().getValue(),
                    messageId: messageId?.getValue() ?? null,
                    role: message.getRole(),
                    timestamp: message.getTimestamp().getValue(),
                    content: {
                        text: message.getContent(),
                        sources: sources,
                        mediaContent: null,
                    },
                };
            })
        );

        return messagesWithSources;
    }

    public async speechToText(audio: Buffer): Promise<string> {
        return await this.llmProvider.speechToText(audio);
    }
}
