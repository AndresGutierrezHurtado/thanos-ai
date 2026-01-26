// import { Db } from "mongodb";
// import Database from "../infrastructure/persistence/database";

// // Express
// import { Request } from "express";

// // Services
// import SessionServiceInterface from "../domain/contracts/services/SessionServiceInterface";
// import AiServiceInterface from "../domain/contracts/services/AiServiceInterface";
// import PasswordHasher from "../domain/contracts/services/PasswordHasher";
// import SessionService from "../infrastructure/services/SessionService";
// import OllamaService from "../infrastructure/services/Ai/OllamaService";
// import BcryptPasswordHasher from "../infrastructure/services/BcryptPasswordHasher";

// // Chat
// import ChatUseCase from "../application/useCases/chatUseCase";
// import ChatRepository from "../infrastructure/persistence/repositories/chatRepository";
// import ChatController from "../infrastructure/http/controllers/chatController";

// // Message
// import MessageUseCase from "../application/useCases/messageUseCase";
// import MessageRepository from "../infrastructure/persistence/repositories/messageRepository";
// import MessageController from "../infrastructure/http/controllers/messageController";

// // Auth
// import UserRepository from "../infrastructure/persistence/repositories/userRepository";
// import AuthUseCase from "../application/useCases/authUseCase";
// import AuthController from "../infrastructure/http/controllers/authController";

// // Preference
// import UserPreferenceRepository from "../infrastructure/persistence/repositories/userPreferenceRepository";
// import PreferenceUseCase from "../application/useCases/preferenceUseCase";
// import PreferenceController from "../infrastructure/http/controllers/preferenceController";

// export default class DIContainer {
//     private static instance: DIContainer;
//     private db: Db;

//     private constructor(db: Db) {
//         this.db = db;
//     }

//     static async getInstance(): Promise<DIContainer> {
//         if (!this.instance) {
//             const db = await Database.getInstance().getDb();
//             return new DIContainer(db);
//         }
//         return this.instance;
//     }

//     // Repositories
//     public getUserRepository(): UserRepository {
//         return new UserRepository(this.db);
//     }

//     public getChatRepository(): ChatRepository {
//         return new ChatRepository(this.db);
//     }

//     public getMessageRepository(): MessageRepository {
//         return new MessageRepository(this.db);
//     }

//     public getUserPreferenceRepository(): UserPreferenceRepository {
//         return new UserPreferenceRepository(this.db);
//     }

//     // Services
//     public getPasswordHasher(): PasswordHasher {
//         return new BcryptPasswordHasher();
//     }

//     public getAiService(): AiServiceInterface {
//         return new OllamaService();
//     }

//     public getSessionService(req: Request): SessionServiceInterface {
//         const userRepository = this.getUserRepository();
//         return new SessionService(req, userRepository);
//     }

//     // Use Cases
//     public getChatUseCase(req: Request): ChatUseCase {
//         const chatRepository = this.getChatRepository();
//         const sessionService = this.getSessionService(req);
//         return new ChatUseCase(chatRepository, sessionService);
//     }

//     public getMessageUseCase(): MessageUseCase {
//         const messageRepository = this.getMessageRepository();
//         const aiService = this.getAiService();
//         return new MessageUseCase(messageRepository, aiService);
//     }

//     public getAuthUseCase(req: Request): AuthUseCase {
//         const userRepository = this.getUserRepository();
//         const sessionService = this.getSessionService(req);
//         const passwordHasher = this.getPasswordHasher();
//         return new AuthUseCase(userRepository, sessionService, passwordHasher);
//     }

//     public getPreferenceUseCase(req: Request): PreferenceUseCase {
//         const userPreferenceRepository = this.getUserPreferenceRepository();
//         const sessionService = this.getSessionService(req);
//         return new PreferenceUseCase(userPreferenceRepository, sessionService);
//     }

//     // Message
//     public getChatController(): ChatController {
//         return new ChatController(this);
//     }

//     public getMessageController(): MessageController {
//         const messageUseCase = this.getMessageUseCase();
//         return new MessageController(messageUseCase);
//     }

//     public getAuthController(): AuthController {
//         return new AuthController(this);
//     }

//     public getPreferenceController(): PreferenceController {
//         return new PreferenceController(this);
//     }
// }
