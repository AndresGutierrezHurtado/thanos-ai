import { Db, Collection } from "mongodb";

// Application
import IChatRepository from "../../../application/ports/repositories/IChatRepository";

// Domain
import Chat from "../../../domain/entities/chat";
import Identifier from "../../../domain/valueObjects/Identifier";

// Mappers
import ChatMapper, { ChatDocument } from "../mappers/ChatMapper";

export default class ChatRepository implements IChatRepository {
    private readonly collection: Collection<ChatDocument>;

    constructor(db: Db) {
        this.collection = db.collection<ChatDocument>("chats");
    }

    public async findAll(): Promise<Chat[]> {
        const chats = await this.collection.find().toArray();
        return chats.map((chat) => ChatMapper.toDomain(chat));
    }

    public async findById(id: Identifier): Promise<Chat | null> {
        const chat = await this.collection.findOne({ id: id.getValue() });
        if (!chat) return null;
        return ChatMapper.toDomain(chat);
    }

    public async create(chat: Chat): Promise<Chat> {
        if (!chat.getId()) {
            const newId = new Identifier(
                `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
            );
            chat.setId(newId);
        }

        const doc = ChatMapper.toPersistence(chat);
        await this.collection.insertOne(doc);
        return chat;
    }

    public async update(chat: Chat): Promise<Chat> {
        const id = chat.getId();
        if (!id) {
            throw new Error("Cannot update chat without id");
        }

        const doc = ChatMapper.toPersistence(chat);
        await this.collection.updateOne({ id: id.getValue() }, { $set: doc });
        return chat;
    }

    public async delete(id: Identifier): Promise<void> {
        await this.collection.deleteOne({ id: id.getValue() });
    }
}

