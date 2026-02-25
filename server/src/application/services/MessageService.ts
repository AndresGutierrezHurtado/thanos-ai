// DOMAIN
import Message from "../../domain/entities/message";
import Chat from "../../domain/entities/chat";
import Identifier from "../../domain/valueObjects/Identifier";
import MessageRole from "../../domain/valueObjects/MessageRole";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";

// PORTS
import { LlmProviderName } from "../ports/services/ILlmProvider";
import IMessageRepository from "../ports/repositories/IMessageRepository";
import ISourceRepository from "../ports/repositories/ISourceRepository";

// INFRASTRUCTURE
import LlmFactory from "../../infrastructure/ai/LlmFactory";

export default class MessageService {
    constructor(
        private readonly llmFactory: LlmFactory,
        private readonly messageRepository: IMessageRepository,
        private readonly sourceRepository: ISourceRepository,
    ) {}

    async generateResponse(
        chat: Chat,
        messages: Message[],
        provider: LlmProviderName = "gpt",
        extractedText?: string,
        onChunk?: (text: string) => void,
    ): Promise<Chat> {
        const llmProvider = this.llmFactory.getTextProvider(provider);

        // Generate the AI response
        const { response: llmResponse, sources } = await llmProvider.generateResponse(
            messages,
            500,
            0.3,
            extractedText,
            onChunk,
        );

        const assistantMessage = await this.messageRepository.create(
            new Message(
                null,
                chat.getId() as Identifier,
                chat.getUserId(),
                MessageRole.ASSISTANT,
                llmResponse,
                new DateTimeValue(),
                null,
            ),
        );

        for (const source of sources) {
            source.setMessageId(assistantMessage.getId() as Identifier);
            await this.sourceRepository.create(source);
        }

        chat.addMessage(assistantMessage);

        return chat;
    }

    async generateSpeechResponse(chat: Chat, messages: Message[]): Promise<Chat> {
        const llmProvider = this.llmFactory.getAudioProvider();

        // Respuesta optimizada para voz: modelo directo, menos tokens y estilo conversacional en párrafos
        const llmResponse = await llmProvider.generateConversationalResponse(
            messages,
            500,
            0.35,
        );

        const assistantMessage = await this.messageRepository.create(
            new Message(
                null,
                chat.getId() as Identifier,
                chat.getUserId(),
                MessageRole.ASSISTANT,
                llmResponse.response,
                new DateTimeValue(),
                null,
            ),
        );

        for (const source of llmResponse.sources) {
            source.setMessageId(assistantMessage.getId() as Identifier);
            await this.sourceRepository.create(source);
        }

        chat.addMessage(assistantMessage);

        return chat;
    }

    async generateTitle(content: string, provider: LlmProviderName = "gpt"): Promise<string> {
        return await this.llmFactory.getTextProvider(provider).generateSimpleResponse(
            `Genera un titulo corto y descriptivo para la conversación segun el contenido de la conversación: ${content}`,
        );
    }
}
