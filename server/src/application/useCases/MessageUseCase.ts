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

        const { message: assistantMessage, sources } =
            await this.llmProvider.generateResponse(chat, messagesForLlm, onChunk);
        const savedMessage = await this.messageRepository.create(assistantMessage);

        return {
            chatId: chat.getId()?.getValue() ?? null,
            messageId: userMessage.getId()?.getValue() ?? null,
            role: MessageRole.ASSISTANT,
            timestamp: savedMessage.getTimestamp().getValue(),
            content: {
                text: savedMessage.getContent(),
                sources: sources.length > 0 ? sources : null,
                mediaContent: null,
            },
        };
    }

    public async getMessagesByChatId(chatId: string): Promise<MessageResponseDto[]> {
        const messages = await this.messageRepository.findByChatId(new Identifier(chatId));
        return messages.map((message) => ({
            chatId: message.getChatId().getValue(),
            messageId: message.getId()?.getValue() ?? null,
            role: message.getRole(),
            timestamp: message.getTimestamp().getValue(),
            content: {
                text: message.getContent(),
                sources: null,
                mediaContent: null,
            },
        }));
    }
}
