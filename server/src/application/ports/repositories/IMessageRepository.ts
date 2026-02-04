import Message from "../../../domain/entities/message";
import Identifier from "../../../domain/valueObjects/Identifier";

interface IMessageRepository {
    findById(id: Identifier): Promise<Message | null>;
    findByChatId(chatId: Identifier): Promise<Message[]>;
    create(message: Message): Promise<Message>;
    update(messageId: Identifier, message: Message): Promise<Message>;
    delete(messageId: Identifier): Promise<void>;
    deleteByChatIdAfterTimestamp(chatId: Identifier, afterTimestamp: Date): Promise<void>;
}

export default IMessageRepository;
