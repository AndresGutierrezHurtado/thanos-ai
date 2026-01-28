import Chat from "../../../domain/entities/chat";
import Identifier from "../../../domain/valueObjects/Identifier";
import DateTimeValue from "../../../domain/valueObjects/DateTimeValue";

export interface ChatDocument {
    id: string;
    userId: string | null;
    title: string;
    createdAt: Date;
    updatedAt: Date;
}

export default class ChatMapper {
    public static toDomain(doc: ChatDocument): Chat {
        const id = doc.id ? new Identifier(doc.id) : null;
        const userId = doc.userId ? new Identifier(doc.userId) : null;

        return new Chat(
            id,
            userId,
            doc.title,
            new DateTimeValue(doc.createdAt),
            new DateTimeValue(doc.updatedAt)
        );
    }

    public static toPersistence(entity: Chat): ChatDocument {
        const id = entity.getId();
        const userId = entity.getUserId();

        if (!id) {
            throw new Error("Chat id is required to persist");
        }

        return {
            id: id.getValue(),
            userId: userId ? userId.getValue() : null,
            title: entity.getTitle(),
            createdAt: entity.getCreatedAt().getValue(),
            updatedAt: entity.getUpdatedAt().getValue(),
        };
    }
}

