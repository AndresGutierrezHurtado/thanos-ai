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
import DocumentTools, { describe, formatRead } from "./DocumentTools";
import { parseMentions, renderMentions } from "./mentions";

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
 * find, search, read), resolves "@" mentions, and persists the answer with its sources.
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
                    content: `Genera un titulo corto y descriptivo para la conversación segun el contenido de la conversación: ${renderMentions(content)}`,
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
                content: renderMentions(message.getContent()),
            })),
        ];

        const lastUserIndex = messages.map((m) => m.getRole()).lastIndexOf(MessageRole.USER);
        const lastUser = lastUserIndex >= 0 ? chatMessages[lastUserIndex + 1] : chatMessages[chatMessages.length - 1];

        // Mentions of the latest message are resolved and given as context with it
        if (lastUserIndex >= 0) {
            const context = await this.mentionsContext(messages[lastUserIndex].getContent(), tools);
            if (context) lastUser.content += `\n\n${context}`;
        }

        // Attachments are appended to the latest user message
        if (extractedText) {
            lastUser.content += `\n\nCONTENIDO DEL ARCHIVO ADJUNTO:\n${extractedText}`;
        }

        return chatMessages;
    }

    /**
     * Context for the documents and folders the user mentioned with "@". Small documents are
     * given in full; larger ones and folders are left for the assistant to read or explore.
     * Mentions of things that do not exist (typed by hand, or since removed) are ignored.
     */
    private async mentionsContext(content: string, tools: DocumentTools): Promise<string | null> {
        const mentions = parseMentions(content);
        if (mentions.length === 0) return null;

        const docIds = mentions.filter((m) => m.kind === "doc").map((m) => m.id);
        const folderIds = mentions.filter((m) => m.kind === "folder").map((m) => m.id);
        const [documents, folders] = await Promise.all([
            this.documentRepository.findByDriveIds(docIds),
            folderIds.length
                ? this.documentRepository.findFolders({ ids: folderIds, limit: folderIds.length })
                : Promise.resolve([]),
        ]);

        const parts: string[] = [];
        for (const document of documents) {
            if (await tools.fitsWhole(document.getDriveId())) {
                const read = await tools.readDocument(document.getDriveId());
                if (read && read.totalChunks > 0) {
                    parts.push(`DOCUMENTO MENCIONADO (contenido completo):\n${formatRead(read, 0)}`);
                    continue;
                }
            }
            parts.push(
                `DOCUMENTO MENCIONADO: ${describe(document)}. Es extenso: léelo con read_document (por partes si hace falta) o busca en él con search_documents y documentIds.`,
            );
        }
        for (const folder of folders) {
            parts.push(
                `CARPETA MENCIONADA: ${folder.location} [folder:${folder.id}] (${folder.documents} documentos). ` +
                    "Trabaja dentro de ella: explórala con list_folder, busca con find_documents o search_documents usando este folderId, " +
                    "elige los documentos relevantes para la tarea y léelos con read_document antes de responder.",
            );
        }

        return parts.length ? `CONTEXTO DE LAS MENCIONES (@) DEL USUARIO:\n\n${parts.join("\n\n")}` : null;
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
