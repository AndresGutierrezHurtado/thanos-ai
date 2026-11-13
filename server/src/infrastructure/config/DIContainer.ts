import path from "path";
import { Db } from "mongodb";

// Presentation
import MessageController from "../../presentation/http/controllers/messageController";
import DocumentController from "../../presentation/http/controllers/documentController";
import ChatController from "../../presentation/http/controllers/chatController";
import HealthController from "../../presentation/http/controllers/healthController";
import AuthController from "../../presentation/http/controllers/authController";

// Application
import MessageUseCase from "../../application/useCases/MessageUseCase";
import ChatUseCase from "../../application/useCases/chatUseCase";
import AuthUseCase from "../../application/useCases/AuthUseCase";
import InformationUseCase from "../../application/useCases/informationUseCase";
import SpeechUseCase from "../../application/useCases/SpeechUseCase";
import ProcessFileService from "../../application/services/ProcessFileService";

// Ports
import IChatRepository from "../../application/ports/repositories/IChatRepository";
import IMessageRepository from "../../application/ports/repositories/IMessageRepository";
import IDocumentRepository from "../../application/ports/repositories/IDocumentRepository";
import ISourceRepository from "../../application/ports/repositories/ISourceRepository";
import IMediaContentRepository from "../../application/ports/repositories/IMediaContentRepository";
import IUserRepository from "../../application/ports/repositories/IUserRepository";
import IPasswordHasher from "../../application/ports/services/IPasswordHasher";
import ITokenProvider from "../../application/ports/services/ITokenProvider";
import IEmailSender from "../../application/ports/services/IEmailSender";
import IChatProvider from "../../application/ports/services/IChatProvider";
import ISpeechProvider from "../../application/ports/services/ISpeechProvider";
import IEmbeddingProvider from "../../application/ports/services/IEmbeddingProvider";
import IDriveProvider, { IWritableDriveProvider } from "../../application/ports/services/IDriveProvider";
import ILogger from "../../application/ports/services/ILogger";

// Infrastructure
import ChatRepository from "../persistence/repositories/ChatRepository";
import MessageRepository from "../persistence/repositories/MessageRepository";
import DocumentRepository from "../persistence/repositories/DocumentRepository";
import SourceRepository from "../persistence/repositories/SourceRepository";
import MediaContentRepository from "../persistence/repositories/MediaContentRepository";
import UserRepository from "../persistence/repositories/UserRepository";
import BcryptPasswordHasher from "../services/BcryptPasswordHasher";
import JwtTokenProvider from "../services/JwtTokenProvider";
import ConsoleEmailSender from "../services/ConsoleEmailSender";
import NodemailerEmailSender from "../services/NodemailerEmailSender";
import Database from "../persistence/Database";
import ChromaVectorStore from "../ai/ChromaVectorStore";
import ProcessorFactory from "../services/ProcessorFactory";
import HierarchicalChunker from "../services/HierarchicalChunker";
import LoggerAdapter from "../services/LoggerAdapter";
import AiProviderFactory from "../ai/AiProviderFactory";
import GoogleDriveProvider from "../drive/googleDriveProvider";
import LocalFileSystemProvider from "../drive/LocalFileSystemProvider";
import MessageService from "../../application/services/MessageService";

export default class DIContainer {
    private static instance: DIContainer;
    // Holds the in-process sync state: everyone must share the same instance
    private informationUseCase: InformationUseCase | null = null;

    private constructor(private readonly db: Db) {}

    static async getInstance(): Promise<DIContainer> {
        if (!this.instance) {
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

    public getDocumentController(): DocumentController {
        return new DocumentController(this.getInformationUseCase());
    }

    public getHealthController(): HealthController {
        return new HealthController(this.getLogger());
    }

    public getAuthController(): AuthController {
        return new AuthController(this.getAuthUseCase());
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
            this.getProcessorFactory(),
            this.getUserRepository(),
        );
    }

    private getChatUseCase(): ChatUseCase {
        return new ChatUseCase(
            this.getChatRepository(),
            this.getMessageRepository(),
            this.getMediaContentRepository(),
            this.getMessageService(),
            this.getProcessorFactory(),
            this.getUserRepository(),
        );
    }

    private getAuthUseCase(): AuthUseCase {
        return new AuthUseCase(
            this.getUserRepository(),
            this.getPasswordHasher(),
            this.getTokenProvider(),
            this.getEmailSender(),
        );
    }

    public getInformationUseCase(): InformationUseCase {
        this.informationUseCase ??= new InformationUseCase(
            this.getDriveSource(),
            this.getLocalSource(),
            this.getDocumentRepository(),
            this.getVectorStore(),
            this.getProcessFileService(),
            this.getLogger(),
        );
        return this.informationUseCase;
    }

    public getSpeechUseCase(): SpeechUseCase {
        return new SpeechUseCase(
            this.getChatRepository(),
            this.getMessageRepository(),
            this.getSpeechProvider(),
            this.getMessageService(),
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

    private getUserRepository(): IUserRepository {
        return new UserRepository(this.db);
    }

    private getPasswordHasher(): IPasswordHasher {
        return new BcryptPasswordHasher();
    }

    private getTokenProvider(): ITokenProvider {
        return new JwtTokenProvider();
    }

    private getEmailSender(): IEmailSender {
        if (process.env.SMTP_HOST) {
            return new NodemailerEmailSender();
        }
        return new ConsoleEmailSender();
    }

    // Application Services
    private getMessageService(): MessageService {
        return new MessageService(
            this.getChatProvider(),
            this.getVectorStore(),
            this.getMessageRepository(),
            this.getSourceRepository(),
        );
    }

    private getProcessorFactory(): ProcessorFactory {
        return new ProcessorFactory();
    }

    // Infrastructure Services
    private getProcessFileService(): ProcessFileService {
        return new ProcessFileService(
            this.getDocumentRepository(),
            this.getProcessorFactory(),
            this.getChunker(),
            this.getVectorStore(),
        );
    }

    public getLogger(): ILogger {
        return new LoggerAdapter();
    }

    private getChunker(): HierarchicalChunker {
        return new HierarchicalChunker();
    }

    private getVectorStore(): ChromaVectorStore {
        return new ChromaVectorStore(this.getDocumentRepository(), this.getEmbeddingProvider());
    }

    private getChatProvider(): IChatProvider {
        return AiProviderFactory.createChatProvider();
    }

    private getEmbeddingProvider(): IEmbeddingProvider {
        return AiProviderFactory.createEmbeddingProvider();
    }

    private getSpeechProvider(): ISpeechProvider {
        return AiProviderFactory.createSpeechProvider();
    }

    /** Google Drive is optional: without its credentials only uploaded files are used. */
    private getDriveSource(): IDriveProvider | null {
        if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) return null;
        return new GoogleDriveProvider(this.getLogger());
    }

    /** Files uploaded from the app (a Docker volume in production). */
    private getLocalSource(): IWritableDriveProvider {
        return new LocalFileSystemProvider(path.join(process.cwd(), "uploads"));
    }
}
