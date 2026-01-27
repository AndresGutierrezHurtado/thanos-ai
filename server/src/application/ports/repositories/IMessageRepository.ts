import Message from "../../../domain/entities/message";
import Identifier from "../../../domain/valueObjects/Identifier";

interface IMessageRepository {
    findByChatId(chatId: Identifier): Promise<Message[]>;
    create(message: Message): Promise<Message>;
    update(messageId: Identifier, message: Message): Promise<Message>;
    delete(messageId: Identifier): Promise<void>;
}

export default IMessageRepository;
