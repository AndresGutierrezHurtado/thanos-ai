import User from "../../../domain/entities/user";
import Identifier from "../../../domain/valueObjects/Identifier";
import DateTimeValue from "../../../domain/valueObjects/DateTimeValue";
import Email from "../../../domain/valueObjects/Email";

export interface UserDocument {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    validatedEmail: boolean;
    otpCode: string | null;
    otpExpiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    systemPrompt?: string | null;
}

export default class UserMapper {
    public static toDomain(doc: UserDocument): User {
        const id = doc.id ? new Identifier(doc.id) : null;
        const email = new Email(doc.email);
        return new User(
            id,
            email,
            doc.name ?? "",
            doc.passwordHash,
            doc.validatedEmail !== false,
            doc.otpCode ?? null,
            doc.otpExpiresAt ?? null,
            new DateTimeValue(doc.createdAt),
            new DateTimeValue(doc.updatedAt),
            doc.systemPrompt ?? null,
        );
    }

    public static toPersistence(entity: User): UserDocument {
        const id = entity.getId();
        if (!id) {
            throw new Error("User id is required to persist");
        }
        return {
            id: id.getValue(),
            email: entity.getEmail().getValue(),
            name: entity.getName(),
            passwordHash: entity.getPasswordHash(),
            validatedEmail: entity.getValidatedEmail(),
            otpCode: entity.getOtpCode(),
            otpExpiresAt: entity.getOtpExpiresAt(),
            createdAt: entity.getCreatedAt().getValue(),
            updatedAt: entity.getUpdatedAt().getValue(),
            systemPrompt: entity.getSystemPrompt(),
        };
    }
}
