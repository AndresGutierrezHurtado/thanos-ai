import User from "../../../domain/entities/user";

export interface UserResource {
    id: string;
    name: string;
    email: string;
    systemPrompt: string | null;
}

export function toUserResource(user: User): UserResource {
    return {
        id: user.getId()?.getValue() ?? "",
        name: user.getName(),
        email: user.getEmail().getValue(),
        systemPrompt: user.getSystemPrompt(),
    };
}
