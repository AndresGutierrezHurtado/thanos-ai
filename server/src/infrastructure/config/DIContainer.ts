import { Db } from "mongodb";

// Presentation
import MessageController from "../http/controllers/messageController";

// Application
import MessageUseCase from "../../application/useCases/MessageUseCase";
import ChatUseCase from "../../application/useCases/chatUseCase";

// Ports
import IChatRepository from "../../application/ports/repositories/IChatRepository";
import IMessageRepository from "../../application/ports/repositories/IMessageRepository";
import ILlmProvider from "../../application/ports/provider/ILlmProvider";

// Providers
import LlmProvider from "../providers/LlmProvider";
import ChatRepository from "../persistence/repositories/ChatRepository";
import MessageRepository from "../persistence/repositories/MessageRepository";
import Database from "../persistence/Database";
import ChatController from "../http/controllers/chatController";

export default class DIContainer {
    private static instance: DIContainer;

    private constructor(
        private readonly db: Db
    ) {}

    static async getInstance(): Promise<DIContainer> {
        if (!this.instance) {
            const db = await Database.getInstance().getDb();
            this.instance = new DIContainer(db);
        }
        return this.instance;
    }

    // Controllers
    public getMessageController(): MessageController {
        return new MessageController(this.getMessageUseCase());
    }

    public getChatController(): ChatController {
        return new ChatController(this.getChatUseCase());
    }

    // Use Cases
    private getMessageUseCase(): MessageUseCase {
        return new MessageUseCase(
            this.getChatRepository(),
            this.getMessageRepository(),
            this.getLlmProvider()
        );
    }

    private getChatUseCase(): ChatUseCase {
        return new ChatUseCase(
            this.getChatRepository(),
            this.getMessageRepository(),
            this.getLlmProvider()
        );
    }

    // Repositories
    private getChatRepository(): IChatRepository {
        return new ChatRepository(this.db);
    }

    private getMessageRepository(): IMessageRepository {
        return new MessageRepository(this.db);
    }

    // Providers
    private getLlmProvider(): ILlmProvider {
        return new LlmProvider();
    }
}
