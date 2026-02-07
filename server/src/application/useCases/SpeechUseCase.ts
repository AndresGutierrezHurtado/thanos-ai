// Ports
import IChatRepository from "../ports/repositories/IChatRepository";
import IMessageRepository from "../ports/repositories/IMessageRepository";
import ISourceRepository from "../ports/repositories/ISourceRepository";
import ILlmProvider from "../ports/provider/ILlmProvider";
import ILogger, { SyslogSeverity } from "../ports/services/ILogger";

// Domain
import Message from "../../domain/entities/message";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";
import Identifier from "../../domain/valueObjects/Identifier";
import MessageRole from "../../domain/valueObjects/MessageRole";

export default class SpeechUseCase {
    constructor(
        private readonly chatRepository: IChatRepository,
        private readonly messageRepository: IMessageRepository,
        private readonly sourceRepository: ISourceRepository,
        private readonly llmProvider: ILlmProvider,
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

        this.logger.log(SyslogSeverity.DEBUG, "Generating simple response", { messagesCount: messages.length });
        const { message: assistantMessage, sources } = await this.llmProvider.generateSimpleResponse(
            chat,
            messages,
        );

        this.logger.log(SyslogSeverity.DEBUG, "saving message", { assistantMessage });
        const savedMessage = await this.messageRepository.create(assistantMessage);

        for (const source of sources) {
            source.setMessageId(savedMessage.getId() as Identifier);
            await this.sourceRepository.create(source);
        }

        const responseText = assistantMessage.getContent();
        this.logger.log(SyslogSeverity.DEBUG, "Text to speech", { responseText });
        return await this.llmProvider.textToSpeech(responseText);
    }
}
