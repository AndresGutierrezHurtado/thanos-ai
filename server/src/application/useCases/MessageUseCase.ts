// Ports
import IChatRepository from "../ports/repositories/IChatRepository";
import IMessageRepository from "../ports/repositories/IMessageRepository";
import ISourceRepository from "../ports/repositories/ISourceRepository";
import ILlmProvider from "../ports/provider/ILlmProvider";
import ILogger from "../ports/services/ILogger";

// DTOs and Resources
import SendMessageDto from "../dtos/SendMessageDTO";
import UpdateMessageDto from "../dtos/updateMessageDTO";
import { MessageResource, toMessageResource } from "../resources/MessageResource";

// Domain
import Message from "../../domain/entities/message";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";
import Identifier from "../../domain/valueObjects/Identifier";
import MessageRole from "../../domain/valueObjects/MessageRole";

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
    ): Promise<MessageResource> {
        const { chatId, content, mediaContent } = messageDto;

        const chat = await this.chatRepository.findById(new Identifier(chatId as string));
        if (!chat) throw new Error("Chat not found");

        // Save the user message
        await this.messageRepository.create(
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
        const messages = await this.messageRepository.findByChatId(chat.getId() as Identifier);

        // Generate the assistant message and save it and its sources
        const { message: assistantMessage, sources } = await this.llmProvider.generateResponse(
            chat,
            messages,
            onChunk
        );
        const savedMessage = await this.messageRepository.create(assistantMessage);

        for (const source of sources) {
            source.setMessageId(savedMessage.getId() as Identifier);
            const savedSource = await this.sourceRepository.create(source);
            savedMessage.addSource(savedSource);
        }

        return toMessageResource(savedMessage);
    }

    public async updateMessage(
        dto: UpdateMessageDto,
        onChunk?: (text: string) => void
    ): Promise<MessageResource> {
        // Get the message to update
        let message = await this.messageRepository.findById(new Identifier(dto.id));
        if (!message) throw new Error("Message not found");

        const chat = await this.chatRepository.findById(message.getChatId());
        if (!chat) throw new Error("Chat not found");

        // Update the message content and timestamp
        message.setContent(dto.content);
        message.setTimestamp(new DateTimeValue());
        await this.messageRepository.update(message.getId()!, message);

        await this.messageRepository.deleteByChatIdAfterTimestamp(
            message.getChatId(),
            message.getTimestamp().getValue()
        );

        // Get the latest messages for the LLM
        const messages = await this.messageRepository.findByChatId(message.getChatId());

        // Generate the assistant message and save it and its sources
        let { message: assistantMessage, sources } = await this.llmProvider.generateResponse(
            chat,
            messages,
            onChunk
        );
        assistantMessage = await this.messageRepository.create(assistantMessage);

        for (const source of sources) {
            source.setMessageId(assistantMessage.getId() as Identifier);
            await this.sourceRepository.create(source);
        }

        return toMessageResource(assistantMessage);
    }

    public async getMessagesByChatId(chatId: string): Promise<MessageResource[]> {
        const messages = await this.messageRepository.findByChatId(new Identifier(chatId));

        const messagesList: MessageResource[] = await Promise.all(
            messages.map(async (message) => {
                const messageId = message.getId();
                const sources = messageId
                    ? await this.sourceRepository.findByMessageId(messageId)
                    : [];

                message.setSources(sources);

                return toMessageResource(message);
            })
        );

        return messagesList;
    }

    public async speechToText(audio: Buffer): Promise<string> {
        return await this.llmProvider.speechToText(audio);
    }
}
