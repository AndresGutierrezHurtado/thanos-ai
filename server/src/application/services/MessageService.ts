// DOMAIN
import Message from "../../domain/entities/message";
import Chat from "../../domain/entities/chat";
import Source from "../../domain/entities/source";
import Identifier from "../../domain/valueObjects/Identifier";
import MessageRole from "../../domain/valueObjects/MessageRole";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";

// PORTS
import IChatProvider, { ChatMessage } from "../ports/services/IChatProvider";
import IVectorStore from "../ports/services/IVectorStore";
import IMessageRepository from "../ports/repositories/IMessageRepository";
import ISourceRepository from "../ports/repositories/ISourceRepository";
import IDocumentRepository from "../ports/repositories/IDocumentRepository";

import { SYSTEM_PROMPT, SPEECH_SYSTEM_PROMPT } from "./prompts";
import DocumentTools from "./DocumentTools";

/** What a streamed answer sends while it is generated: answer text, or progress. */
export type ResponseEvent = { text: string } | { status: string };

export interface MessageServiceConfig {
    /** Characters of documents the assistant may read for one written answer */
    readBudget: number;
}

// Tool rounds (search, read...) before the assistant must answer
const MAX_TOOL_ROUNDS = 12;
const SPEECH_MAX_TOOL_ROUNDS = 4;

/**
 * Orchestrates the assistant: builds prompts, gives the model document tools (explore,
 * find, search, read) and persists the answer with its sources.
 */
export default class MessageService {
    constructor(
        private readonly chatProvider: IChatProvider,
        private readonly vectorStore: IVectorStore,
        private readonly documentRepository: IDocumentRepository,
        private readonly messageRepository: IMessageRepository,
        private readonly sourceRepository: ISourceRepository,
        private readonly config: MessageServiceConfig,
    ) {}

    async generateResponse(
        chat: Chat,
        messages: Message[],
        extractedText?: string,
        onEvent?: (event: ResponseEvent) => void,
        userSystemPrompt?: string | null,
    ): Promise<Chat> {
        const systemPrompt = userSystemPrompt?.trim()
            ? `${SYSTEM_PROMPT}\n\nINSTRUCCIONES ADICIONALES DEL USUARIO:\n${userSystemPrompt}`
            : SYSTEM_PROMPT;

        const tools = new DocumentTools(this.documentRepository, this.vectorStore, {
            readBudget: this.config.readBudget,
            onStatus: onEvent && ((status) => onEvent({ status })),
        });
        const chatMessages = await this.toChatMessages(systemPrompt, messages, tools, extractedText);

        const response = await this.chatProvider.chat({
            messages: chatMessages,
            tools: tools.tools(),
            temperature: 0.3,
            maxTokens: 2000,
            maxToolRounds: MAX_TOOL_ROUNDS,
            onChunk: onEvent && ((text) => onEvent({ text })),
        });

        return this.saveAssistantMessage(chat, response, tools.sources());
    }

    async generateSpeechResponse(chat: Chat, messages: Message[]): Promise<Chat> {
        // Voice: fewer tokens, less reading and a conversational, paragraph-only style
        const tools = new DocumentTools(this.documentRepository, this.vectorStore, {
            readBudget: Math.min(this.config.readBudget, 20_000),
        });
        const response = await this.chatProvider.chat({
            messages: await this.toChatMessages(SPEECH_SYSTEM_PROMPT, messages, tools),
            tools: tools.tools(),
            temperature: 0.35,
            maxTokens: 500,
            maxToolRounds: SPEECH_MAX_TOOL_ROUNDS,
        });

        return this.saveAssistantMessage(chat, response, tools.sources());
    }

    async generateTitle(content: string): Promise<string> {
        return this.chatProvider.chat({
            messages: [
                { role: "system", content: "responde lo mas breve posible" },
                {
                    role: "user",
                    content: `Genera un titulo corto y descriptivo para la conversación segun el contenido de la conversación: ${content}`,
                },
            ],
        });
    }

    private async toChatMessages(
        systemPrompt: string,
        messages: Message[],
        tools: DocumentTools,
        extractedText?: string,
    ): Promise<ChatMessage[]> {
        const chatMessages: ChatMessage[] = [
            { role: "system", content: systemPrompt },
            ...messages.map((message) => ({
                role: message.getRole(),
                content: message.getContent(),
            })),
        ];

        // Attachments are appended to the latest user message
        if (extractedText) {
            const lastUser = [...chatMessages].reverse().find((m) => m.role === "user") ?? chatMessages[chatMessages.length - 1];
            lastUser.content += `\n\nCONTENIDO DEL ARCHIVO ADJUNTO:\n${extractedText}`;
        }

        return chatMessages;
    }

    private async saveAssistantMessage(chat: Chat, content: string, sources: Source[]): Promise<Chat> {
        const assistantMessage = await this.messageRepository.create(
            new Message(
                null,
                chat.getId() as Identifier,
                chat.getUserId(),
                MessageRole.ASSISTANT,
                content,
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
}
