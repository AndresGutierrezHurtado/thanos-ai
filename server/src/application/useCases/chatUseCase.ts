// Domain
import Chat from "../../domain/entities/chat";
import Identifier from "../../domain/valueObjects/Identifier";

// Ports
import IChatRepository from "../ports/repositories/IChatRepository";

export default class ChatUseCase {
    constructor(
        private readonly chatRepository: IChatRepository,
    ) {}

    public async getChats(): Promise<Chat[]> {
        return this.chatRepository.findAll();
    }

    public async getChatById(id: string): Promise<Chat | null> {
        return this.chatRepository.findById(new Identifier(id));
    }

    public async deleteChat(id: string): Promise<void> {
        return this.chatRepository.delete(new Identifier(id));
    }
}