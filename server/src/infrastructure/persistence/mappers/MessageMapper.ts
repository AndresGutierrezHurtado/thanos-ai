import Message from "../../../domain/entities/message";
import Identifier from "../../../domain/valueObjects/Identifier";
import DateTimeValue from "../../../domain/valueObjects/DateTimeValue";
import MessageRole from "../../../domain/valueObjects/MessageRole";

export interface MessageDocument {
    id: string;
    chatId: string;
    userId: string | null;
    role: MessageRole;
    content: string;
    timestamp: Date;
    metadata: Record<string, unknown> | null;
}

export default class MessageMapper {
    public static toDomain(doc: MessageDocument): Message {
        const id = doc.id ? new Identifier(doc.id) : null;
        const chatId = new Identifier(doc.chatId);
        const userId = doc.userId ? new Identifier(doc.userId) : null;

        return new Message(
            id,
            chatId,
            userId,
            doc.role,
            doc.content,
            new DateTimeValue(doc.timestamp),
            doc.metadata
        );
    }

    public static toPersistence(entity: Message): MessageDocument {
        const id = entity.getId();

        if (!id) {
            throw new Error("Message id is required to persist");
        }

        const userId = entity.getUserId();
        return {
            id: id.getValue(),
            chatId: entity.getChatId().getValue(),
            userId: userId ? userId.getValue() : null,
            role: entity.getRole(),
            content: entity.getContent(),
            timestamp: entity.getTimestamp().getValue(),
            metadata: entity.getMetadata(),
        };
    }
}

