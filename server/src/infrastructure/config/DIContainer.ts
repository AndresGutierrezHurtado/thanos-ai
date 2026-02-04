import { Db } from "mongodb";

// Presentation
import MessageController from "../http/controllers/messageController";
import DriveController from "../http/controllers/driveController";

// Application
import MessageUseCase from "../../application/useCases/MessageUseCase";
import ChatUseCase from "../../application/useCases/chatUseCase";
import InformationUseCase from "../../application/useCases/informationUseCase";

// Ports
import IChatRepository from "../../application/ports/repositories/IChatRepository";
import IMessageRepository from "../../application/ports/repositories/IMessageRepository";
import IDocumentRepository from "../../application/ports/repositories/IDocumentRepository";
import ISourceRepository from "../../application/ports/repositories/ISourceRepository";
import ILlmProvider from "../../application/ports/provider/ILlmProvider";
import IDriveProvider from "../../application/ports/provider/IDriveProvider";
import ILogger from "../../application/ports/services/ILogger";

// Infrastructure
import LlmProvider from "../providers/LlmProvider";
import OpenAiModel from "../providers/OpenAiModel";
import OpenAIEmbeddingProvider from "../providers/OpenAIEmbeddingProvider";
import ChatRepository from "../persistence/repositories/ChatRepository";
import MessageRepository from "../persistence/repositories/MessageRepository";
import DocumentRepository from "../persistence/repositories/DocumentRepository";
import SourceRepository from "../persistence/repositories/SourceRepository";
import Database from "../persistence/Database";
import ChatController from "../http/controllers/chatController";
import GoogleDriveProvider from "../drive/googleDriveProvider";
import ProcessorFactory from "../services/ProcessorFactory";
import HierarchicalChunker from "../services/HierarchicalChunker";
import ChromaVectorStore from "../persistence/vectors/ChromaVectorStore";
import HealthController from "../http/controllers/healthController";
import LoggerAdapter from "../services/LoggerAdapter";

export default class DIContainer {
    private static instance: DIContainer;

    private constructor(private readonly db: Db) {}

    static async getInstance(): Promise<DIContainer> {
        if (!this.instance) {
            process.loadEnvFile();
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
        return new ChatController(this.getChatUseCase(), this.getMessageUseCase());
    }

    public getDriveController(): DriveController {
        return new DriveController(this.getInformationUseCase());
    }

    public getHealthController(): HealthController {
        return new HealthController(this.getLogger());
    }

    // Use Cases
    private getMessageUseCase(): MessageUseCase {
        return new MessageUseCase(
            this.getChatRepository(),
            this.getMessageRepository(),
            this.getSourceRepository(),
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

    public getInformationUseCase(): InformationUseCase {
        return new InformationUseCase(
            this.getDriveProvider(),
            this.getDocumentRepository(),
            this.getProcessorFactory(),
            this.getChunker(),
            this.getVectorStore(),
            this.getLogger()
        );
    }

    // Repositories
    private getChatRepository(): IChatRepository {
        return new ChatRepository(this.db);
    }

    private getMessageRepository(): IMessageRepository {
        return new MessageRepository(this.db);
    }

    private getDocumentRepository(): IDocumentRepository {
        return new DocumentRepository(this.db);
    }

    private getSourceRepository(): ISourceRepository {
        return new SourceRepository(this.db);
    }

    // Services
    public getLogger(): ILogger {
        return new LoggerAdapter();
    }

    private getProcessorFactory(): ProcessorFactory {
        return new ProcessorFactory();
    }

    private getChunker(): HierarchicalChunker {
        return new HierarchicalChunker();
    }

    private getVectorStore(): ChromaVectorStore {
        return new ChromaVectorStore(this.getEmbeddingProvider(), this.getDocumentRepository());
    }

    private getEmbeddingProvider(): OpenAIEmbeddingProvider {
        return new OpenAIEmbeddingProvider();
    }

    private getLlmProvider(): ILlmProvider {
        return new LlmProvider(new OpenAiModel(), this.getVectorStore(), this.getLogger());
    }

    public getDriveProvider(): IDriveProvider {
        return new GoogleDriveProvider();
    }
}
