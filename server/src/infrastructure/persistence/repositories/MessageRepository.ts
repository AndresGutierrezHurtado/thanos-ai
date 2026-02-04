import { Db, Collection } from "mongodb";

// Application
import IMessageRepository from "../../../application/ports/repositories/IMessageRepository";

// Domain
import Message from "../../../domain/entities/message";
import Identifier from "../../../domain/valueObjects/Identifier";

// Mappers
import MessageMapper, { MessageDocument } from "../mappers/MessageMapper";

export default class MessageRepository implements IMessageRepository {
    private readonly collection: Collection<MessageDocument>;

    constructor(db: Db) {
        this.collection = db.collection<MessageDocument>("messages");
    }

    public async findById(id: Identifier): Promise<Message | null> {
        const doc = await this.collection.findOne({ id: id.getValue() });
        return doc ? MessageMapper.toDomain(doc) : null;
    }

    public async findByChatId(chatId: Identifier): Promise<Message[]> {
        const messages = await this.collection
            .find({ chatId: chatId.getValue() })
            .sort({ timestamp: 1 })
            .toArray();

        return messages.map((message) => MessageMapper.toDomain(message));
    }

    public async create(message: Message): Promise<Message> {
        if (!message.getId()) {
            const newId = new Identifier(
                `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
            );
            message.setId(newId);
        }

        const doc = MessageMapper.toPersistence(message);
        await this.collection.insertOne(doc);
        return message;
    }

    public async update(messageId: Identifier, message: Message): Promise<Message> {
        const doc = MessageMapper.toPersistence(message);
        await this.collection.updateOne({ id: messageId.getValue() }, { $set: doc });
        return message;
    }

    public async delete(messageId: Identifier): Promise<void> {
        await this.collection.deleteOne({ id: messageId.getValue() });
    }

    public async deleteByChatIdAfterTimestamp(
        chatId: Identifier,
        afterTimestamp: Date
    ): Promise<void> {
        await this.collection.deleteMany({
            chatId: chatId.getValue(),
            timestamp: { $gt: afterTimestamp },
        });
    }
}

