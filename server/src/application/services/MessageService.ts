// DOMAIN
import Message from "../../domain/entities/message";
import Identifier from "../../domain/valueObjects/Identifier";
import Chat from "../../domain/entities/chat";

// PORTS
import ILlmProvider from "../ports/services/ILlmProvider";
import IMessageRepository from "../ports/repositories/IMessageRepository";
import ISourceRepository from "../ports/repositories/ISourceRepository";

export default class MessageService {
    constructor(
        private readonly llmProvider: ILlmProvider,
        private readonly messageRepository: IMessageRepository,
        private readonly sourceRepository: ISourceRepository,
    ) {}

    async generateResponse(
        chat: Chat,
        messages: Message[],
        onChunk?: (text: string) => void,
    ): Promise<Message> {
        // Generate the AI response
        const { message: assistantMessage, sources: retrievedSources } =
            await this.llmProvider.generateResponse(chat, messages, onChunk);
        const savedMessage = await this.messageRepository.create(assistantMessage);

        for (const source of retrievedSources) {
            source.setMessageId(savedMessage.getId() as Identifier);
            const createdSource = await this.sourceRepository.create(source);
            savedMessage.addSource(createdSource);
        }

        return savedMessage;
    }

    async generateTitle(content: string): Promise<string> {
        return await this.llmProvider.generateChatTitle(content);
    }
}
