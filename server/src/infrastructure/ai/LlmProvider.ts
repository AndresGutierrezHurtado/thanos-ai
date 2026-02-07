import path from "path";
import fs from "fs";

// Application
import ILlmProvider from "../../application/ports/provider/ILlmProvider";

// Domain
import Chat from "../../domain/entities/chat";
import Message from "../../domain/entities/message";
import MessageRole from "../../domain/valueObjects/MessageRole";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";
import Identifier from "../../domain/valueObjects/Identifier";
import Source from "../../domain/entities/source";

// Ports
import IVectorStore from "../../application/ports/services/IVectorStore";
import ILogger, { SyslogSeverity } from "../../application/ports/services/ILogger";
import ProcessorFactory from "../services/ProcessorFactory";

// Providers
import OpenAiModel from "./OpenAiModel";

export default class LlmProvider implements ILlmProvider {
    constructor(
        private readonly openAiModel: OpenAiModel,
        private readonly vectorStore: IVectorStore,
        private readonly processorFactory: ProcessorFactory,
        private readonly logger: ILogger,
    ) {}

    public async generateChatTitle(content: string): Promise<string> {
        const title = await this.openAiModel.generateChatTitle(content);
        return title.replaceAll('"', "").trim();
    }

    // FUNCION FOR GENERATING THE RESPONSE WITH THE CONTEXT OF THE DOCUMENTS
    public async generateResponse(
        chat: Chat,
        messages: Message[],
        onChunk?: (text: string) => void,
    ): Promise<{ message: Message; sources: Source[] }> {
        const lastUserMessage = this.getLastUserMessage(messages);
        const documentText = await this.getDocumentFromMessage(lastUserMessage);

        const { context, sources } = await this.retrieveContext(lastUserMessage);

        const responseContent = await this.openAiModel.generateResponse(
            messages.slice(-5),
            context,
            documentText,
            onChunk,
        );

        // Save the response
        const message = new Message(
            null,
            chat.getId() as Identifier,
            MessageRole.ASSISTANT,
            responseContent,
            new DateTimeValue(),
            null,
        );

        return { message, sources };
    }

    public async generateSimpleResponse(
        chat: Chat,
        messages: Message[],
    ): Promise<{ message: Message; sources: Source[] }> {
        const lastUserMessage = this.getLastUserMessage(messages);
        const { context, sources } = await this.retrieveContext(lastUserMessage, 4);

        const responseContent = await this.openAiModel.generateSimpleResponse(
            messages.slice(-5),
            context,
        );

        const message = new Message(
            null,
            chat.getId() as Identifier,
            MessageRole.ASSISTANT,
            responseContent,
            new DateTimeValue(),
            null,
        );

        return { message, sources };
    }

    // FUNCION FOR CONVERTING AUDIO TO TEXT
    public async speechToText(audio: Buffer): Promise<string> {
        return await this.openAiModel.speechToText(audio);
    }

    public async textToSpeech(text: string): Promise<Buffer> {
        return await this.openAiModel.textToSpeech(text);
    }

    // FUNCION FOR GETTING THE LAST USER MESSAGE CONTENT
    private getLastUserMessage(messages: Message[]): Message {
        const userMessages = messages.filter((m) => m.getRole() === MessageRole.USER);
        return userMessages[userMessages.length - 1];
    }

    // FUNCTION FOR GETTING THE DOCUMENT FROM THE MESSAGE
    private async getDocumentFromMessage(message: Message): Promise<string | null> {
        const mediaContent = message.getMediaContent();

        if (!mediaContent || !mediaContent.getUrl() || !mediaContent.getMimeType()) {
            return null;
        }
        const publicDir = path.join(process.cwd(), "public");
        const mediaRelativePath = mediaContent.getUrl().replace(/^\/+/, "");
        const filePath = path.resolve(publicDir, mediaRelativePath);

        let buffer: Buffer;

        try {
            buffer = fs.readFileSync(filePath);
        } catch (error) {
            this.logger.log(SyslogSeverity.ERROR, "Error reading file", { error: error });
            return null;
        }

        const processor = this.processorFactory.get(mediaContent.getMimeType());
        const extracted = await processor.extract(buffer);

        return extracted.text;
    }

    // FUNCION FOR RETRIEVING THE CONTEXT OF THE DOCUMENTS
    private async retrieveContext(
        message: Message,
        maxResults: number = 6,
    ): Promise<{
        context: string;
        sources: Source[];
    }> {
        if (!message.getContent()) {
            return { context: "", sources: [] };
        }

        const results: Source[] = await this.vectorStore.query(
            "iso-docs",
            message.getContent(),
            maxResults,
        );

        let context = "CONTEXTO RELEVANTE DE LOS DOCUMENTOS:\n";
        for (const result of results) {
            context +=
                "- `PATHNAME`: '" +
                result.getDocument()?.getPath() +
                "' - `CONTENT`: " +
                result.getContent() +
                "\n";
        }

        return { context, sources: results };
    }
}
