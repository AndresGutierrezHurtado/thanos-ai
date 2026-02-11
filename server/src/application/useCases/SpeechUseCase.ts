// Ports
import IChatRepository from "../ports/repositories/IChatRepository";
import IMessageRepository from "../ports/repositories/IMessageRepository";
import ISourceRepository from "../ports/repositories/ISourceRepository";
import ILlmProvider from "../ports/services/ILlmProvider";
import ILogger, { SyslogSeverity } from "../ports/services/ILogger";

// Domain
import Message from "../../domain/entities/message";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";
import Identifier from "../../domain/valueObjects/Identifier";
import MessageRole from "../../domain/valueObjects/MessageRole";
import MessageService from "../services/MessageService";

export default class SpeechUseCase {
    constructor(
        private readonly chatRepository: IChatRepository,
        private readonly messageRepository: IMessageRepository,
        private readonly llmProvider: ILlmProvider,
        private readonly messageService: MessageService,
        private readonly logger: ILogger,
    ) {}

    async execute(chatId: string, audio: Buffer): Promise<Buffer> {
        this.logger.log(SyslogSeverity.DEBUG, "Executing speech use case", { chatId, audio });
        const chat = await this.chatRepository.findById(new Identifier(chatId));
        if (!chat) throw new Error("Chat not found");

        this.logger.log(SyslogSeverity.DEBUG, "Speech to text", { audio });
        const text = await this.llmProvider.speechToText(audio);
        await this.messageRepository.create(
            new Message(
                null,
                chat.getId() as Identifier,
                MessageRole.USER,
                text,
                new DateTimeValue(),
                null,
            ),
        );
        const messages = await this.messageRepository.findByChatId(chat.getId() as Identifier);

        this.logger.log(SyslogSeverity.DEBUG, "Generating speech response", {
            messagesCount: messages.length,
        });

        const aiResponseChat = await this.messageService.generateSpeechResponse(chat, messages);

        this.logger.log(SyslogSeverity.DEBUG, "saving message", {
            assistantMessage: aiResponseChat,
        });

        const responseText = aiResponseChat.getLastAssistantMessage()?.getContent() ?? "";
        this.logger.log(SyslogSeverity.DEBUG, "Text to speech", { responseText });
        return await this.llmProvider.textToSpeech(responseText);
    }

    public async speechToText(audio: Buffer): Promise<string> {
        return await this.llmProvider.speechToText(audio);
    }
}
