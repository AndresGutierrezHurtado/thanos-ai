import Message from "../../../domain/entities/message";
import Identifier from "../../../domain/valueObjects/Identifier";
import DateTimeValue from "../../../domain/valueObjects/DateTimeValue";
import MessageRole from "../../../domain/valueObjects/MessageRole";

export interface MessageDocument {
    id: string;
    chatId: string;
    role: MessageRole;
    content: string;
    mediaContentId: string | null;
    timestamp: Date;
    metadata: Record<string, unknown> | null;
}

export default class MessageMapper {
    public static toDomain(doc: MessageDocument): Message {
        const id = doc.id ? new Identifier(doc.id) : null;
        const chatId = new Identifier(doc.chatId);
        const mediaContentId = doc.mediaContentId ? new Identifier(doc.mediaContentId) : null;

        return new Message(
            id,
            chatId,
            doc.role,
            doc.content,
            mediaContentId,
            new DateTimeValue(doc.timestamp),
            doc.metadata
        );
    }

    public static toPersistence(entity: Message): MessageDocument {
        const id = entity.getId();
        const mediaContentId = entity.getMediaContentId();

        if (!id) {
            throw new Error("Message id is required to persist");
        }

        return {
            id: id.getValue(),
            chatId: entity.getChatId().getValue(),
            role: entity.getRole(),
            content: entity.getContent(),
            mediaContentId: mediaContentId ? mediaContentId.getValue() : null,
            timestamp: entity.getTimestamp().getValue(),
            metadata: entity.getMetadata(),
        };
    }
}

