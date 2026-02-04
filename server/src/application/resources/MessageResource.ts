// Domain
import Message from "../../domain/entities/message";
import MessageRole from "../../domain/valueObjects/MessageRole";

// Application
import { SourceResource, toSourceResourceArray } from "./SourceResource";

// Resources
export interface MessageResource {
    chatId: string | null;
    messageId: string | null;
    role: MessageRole;
    timestamp: Date;
    content: {
        text: string;
        sources: null | SourceResource[];
        mediaContent: null | {
            type: "image" | "audio" | "video" | "document";
            buffer: Buffer;
            filename: string;
            mimeType: string;
        };
    };
}

export function toMessageResource(message: Message): MessageResource {
    return {
        chatId: message.getChatId().getValue(),
        messageId: message.getId()?.getValue() ?? null,
        role: message.getRole(),
        timestamp: message.getTimestamp().getValue(),
        content: {
            text: message.getContent(),
            sources: toSourceResourceArray(message.getSources()),
            mediaContent: null,
        },
    };
}

export function toMessageResourceArray(messages: Message[]): MessageResource[] {
    return messages.map((message) => toMessageResource(message));
}
