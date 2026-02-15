import Identifier from "../../../domain/valueObjects/Identifier";
import Chat from "../../../domain/entities/chat";

interface IChatRepository {
    findAll(): Promise<Chat[]>;
    findByUserId(userId: Identifier): Promise<Chat[]>;
    findById(id: Identifier): Promise<Chat | null>;
    create(chat: Chat): Promise<Chat>;
    update(chat: Chat): Promise<Chat>;
    delete(id: Identifier): Promise<void>;
}

export default IChatRepository;
