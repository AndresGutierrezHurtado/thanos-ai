import User from "../../../domain/entities/user";

export interface UserResource {
    id: string;
    email: string;
}

export function toUserResource(user: User): UserResource {
    return {
        id: user.getId()?.getValue() ?? "",
        email: user.getEmail(),
    };
}
