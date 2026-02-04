import Chat from "../../../domain/entities/chat";

export interface ChatResource {
    id: string;
    userId: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
}

export function toChatResource(chat: Chat): ChatResource {
    return {
        id: chat.getId()?.getValue() ?? "",
        userId: chat.getUserId()?.getValue() ?? "",
        title: chat.getTitle(),
        createdAt: chat.getCreatedAt().getValue(),
        updatedAt: chat.getUpdatedAt().getValue(),
    };
}

export function toChatResourceArray(chats: Chat[]): ChatResource[] {
    return chats.map((chat) => toChatResource(chat));
}
