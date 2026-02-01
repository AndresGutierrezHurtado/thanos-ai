import { Db } from "mongodb";

// Presentation
import MessageController from "../../presentation/http/controllers/messageController";
import DriveController from "../../presentation/http/controllers/driveController";
import ChatController from "../../presentation/http/controllers/chatController";
import HealthController from "../../presentation/http/controllers/healthController";

// Application
import MessageUseCase from "../../application/useCases/MessageUseCase";
import ChatUseCase from "../../application/useCases/chatUseCase";
import InformationUseCase from "../../application/useCases/informationUseCase";
import SpeechUseCase from "../../application/useCases/SpeechUseCase";
import ProcessFileService from "../../application/services/ProcessFileService";

// Ports
import IChatRepository from "../../application/ports/repositories/IChatRepository";
import IMessageRepository from "../../application/ports/repositories/IMessageRepository";
import IDocumentRepository from "../../application/ports/repositories/IDocumentRepository";
import ISourceRepository from "../../application/ports/repositories/ISourceRepository";
import IMediaContentRepository from "../../application/ports/repositories/IMediaContentRepository";
import ITransactionRepository from "../../application/ports/repositories/ITransactionRepository";
import ILlmProvider from "../../application/ports/services/ILlmProvider";
import IDriveProvider from "../../application/ports/services/IDriveProvider";
import ILogger from "../../application/ports/services/ILogger";

// Infrastructure
import ChatRepository from "../persistence/repositories/ChatRepository";
import MessageRepository from "../persistence/repositories/MessageRepository";
import DocumentRepository from "../persistence/repositories/DocumentRepository";
import SourceRepository from "../persistence/repositories/SourceRepository";
import TransactionRepository from "../persistence/repositories/TransactionRepository";
import MediaContentRepository from "../persistence/repositories/MediaContentRepository";
import Database from "../persistence/Database";
import ChromaVectorStore from "../ai/ChromaVectorStore";
import ProcessorFactory from "../services/ProcessorFactory";
import HierarchicalChunker from "../services/HierarchicalChunker";
import LoggerAdapter from "../services/LoggerAdapter";
import LlmProvider from "../ai/LlmProvider";
import OpenAiModel from "../ai/OpenAiModel";
import GoogleDriveProvider from "../drive/googleDriveProvider";
import MessageService from "../../application/services/MessageService";

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
        return new MessageController(this.getMessageUseCase(), this.getSpeechUseCase());
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
            this.getDocumentRepository(),
            this.getMediaContentRepository(),
            this.getMessageService(),
        );
    }

    private getChatUseCase(): ChatUseCase {
        return new ChatUseCase(
            this.getChatRepository(),
            this.getMessageRepository(),
            this.getMediaContentRepository(),
            this.getMessageService(),
        );
    }

    public getInformationUseCase(): InformationUseCase {
        return new InformationUseCase(
            this.getDriveProvider(),
            this.getVectorStore(),
            this.getProcessFileService(),
            this.getLogger(),
        );
    }

    public getSpeechUseCase(): SpeechUseCase {
        return new SpeechUseCase(
            this.getChatRepository(),
            this.getMessageRepository(),
            this.getSourceRepository(),
            this.getLlmProvider(),
            this.getLogger(),
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

    private getMediaContentRepository(): IMediaContentRepository {
        return new MediaContentRepository(this.db);
    }

    // Application Services
    private getMessageService(): MessageService {
        return new MessageService(this.getLlmProvider(), this.getMessageRepository(), this.getSourceRepository());
    }

    private getProcessorFactory(): ProcessorFactory {
        return new ProcessorFactory();
    }

    // Infrastructure Services
    private getTransactionRepository(): ITransactionRepository {
        return new TransactionRepository(Database.getInstance(), this.getVectorStore());
    }

    private getProcessFileService(): ProcessFileService {
        return new ProcessFileService(
            this.getDriveProvider(),
            this.getDocumentRepository(),
            this.getProcessorFactory(),
            this.getChunker(),
            this.getVectorStore(),
            this.getTransactionRepository(),
            this.getLogger(),
        );
    }

    public getLogger(): ILogger {
        return new LoggerAdapter();
    }

    private getChunker(): HierarchicalChunker {
        return new HierarchicalChunker();
    }

    private getVectorStore(): ChromaVectorStore {
        return new ChromaVectorStore(this.getAiProvider(), this.getDocumentRepository());
    }

    private getLlmProvider(): ILlmProvider {
        return new LlmProvider(
            this.getAiProvider(),
            this.getVectorStore(),
            this.getProcessorFactory(),
            this.getLogger(),
        );
    }

    private getAiProvider(): OpenAiModel {
        return new OpenAiModel();
    }

    public getDriveProvider(): IDriveProvider {
        return new GoogleDriveProvider(this.getLogger());
    }
}
