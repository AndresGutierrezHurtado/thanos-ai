import User from "../../../domain/entities/user";
import Identifier from "../../../domain/valueObjects/Identifier";
import DateTimeValue from "../../../domain/valueObjects/DateTimeValue";

export interface UserDocument {
    id: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}

export default class UserMapper {
    public static toDomain(doc: UserDocument): User {
        const id = doc.id ? new Identifier(doc.id) : null;
        return new User(
            id,
            doc.email,
            doc.passwordHash,
            new DateTimeValue(doc.createdAt),
            new DateTimeValue(doc.updatedAt),
        );
    }

    public static toPersistence(entity: User): UserDocument {
        const id = entity.getId();
        if (!id) {
            throw new Error("User id is required to persist");
        }
        return {
            id: id.getValue(),
            email: entity.getEmail(),
            passwordHash: entity.getPasswordHash(),
            createdAt: entity.getCreatedAt().getValue(),
            updatedAt: entity.getUpdatedAt().getValue(),
        };
    }
}
