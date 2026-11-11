// DOMAIN
import Message from "../../domain/entities/message";
import Chat from "../../domain/entities/chat";
import Source from "../../domain/entities/source";
import Identifier from "../../domain/valueObjects/Identifier";
import MessageRole from "../../domain/valueObjects/MessageRole";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";

// PORTS
import IChatProvider, { ChatMessage, ChatTool } from "../ports/services/IChatProvider";
import IVectorStore from "../ports/services/IVectorStore";
import IMessageRepository from "../ports/repositories/IMessageRepository";
import ISourceRepository from "../ports/repositories/ISourceRepository";

import { SYSTEM_PROMPT, SPEECH_SYSTEM_PROMPT } from "./prompts";

const DOCUMENTS_COLLECTION = "iso-docs";

/**
 * Orchestrates the assistant: builds prompts, gives the model a document-search
 * tool backed by the vector store, and persists the answer with its sources.
 */
export default class MessageService {
    constructor(
        private readonly chatProvider: IChatProvider,
        private readonly vectorStore: IVectorStore,
        private readonly messageRepository: IMessageRepository,
        private readonly sourceRepository: ISourceRepository,
    ) {}

    async generateResponse(
        chat: Chat,
        messages: Message[],
        extractedText?: string,
        onChunk?: (text: string) => void,
        userSystemPrompt?: string | null,
    ): Promise<Chat> {
        const systemPrompt = userSystemPrompt?.trim()
            ? `${SYSTEM_PROMPT}\n\nINSTRUCCIONES ADICIONALES DEL USUARIO:\n${userSystemPrompt}`
            : SYSTEM_PROMPT;

        const sources: Source[] = [];
        const response = await this.chatProvider.chat({
            messages: this.toChatMessages(systemPrompt, messages, extractedText),
            tools: [this.searchDocumentsTool(sources)],
            temperature: 0.3,
            maxTokens: 1500,
            onChunk,
        });

        return this.saveAssistantMessage(chat, response, sources);
    }

    async generateSpeechResponse(chat: Chat, messages: Message[]): Promise<Chat> {
        // Voice: fewer tokens and a conversational, paragraph-only style
        const sources: Source[] = [];
        const response = await this.chatProvider.chat({
            messages: this.toChatMessages(SPEECH_SYSTEM_PROMPT, messages),
            tools: [this.searchDocumentsTool(sources)],
            temperature: 0.35,
            maxTokens: 500,
        });

        return this.saveAssistantMessage(chat, response, sources);
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

    private toChatMessages(systemPrompt: string, messages: Message[], extractedText?: string): ChatMessage[] {
        const chatMessages: ChatMessage[] = [
            { role: "system", content: systemPrompt },
            ...messages.map((message) => ({ role: message.getRole(), content: message.getContent() })),
        ];

        // Attachments are appended to the latest user message
        if (extractedText) {
            const lastUser = [...chatMessages].reverse().find((m) => m.role === "user") ?? chatMessages[chatMessages.length - 1];
            lastUser.content += `\n\nCONTENIDO DEL ARCHIVO ADJUNTO:\n${extractedText}`;
        }

        return chatMessages;
    }

    /** Search tool for the model; every result is also collected into `sources`. */
    private searchDocumentsTool(sources: Source[]): ChatTool {
        return {
            name: "search_documents",
            description: "Busca información en los documentos internos de la empresa",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "La consulta para buscar información en los documentos internos de la empresa",
                    },
                    limit: { type: "number", description: "El límite de documentos a buscar", default: 5 },
                },
                required: ["query"],
            },
            execute: async (args) => {
                const query = String(args.query ?? "");
                const limit = typeof args.limit === "number" ? args.limit : 5;
                const results = await this.vectorStore.query(DOCUMENTS_COLLECTION, query, limit);
                sources.push(...results);

                let context = "CONTEXTO RELEVANTE DE LOS DOCUMENTOS:\n";
                for (const result of results) {
                    const document = result.getDocument();
                    const url = document ? `https://drive.google.com/file/d/${document.getDriveId()}/view` : null;
                    context += `- '${document?.getPath()}' (${url}): ${result.getContent()}\n`;
                }
                return context;
            },
        };
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
