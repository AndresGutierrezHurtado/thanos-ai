import Source from "../../domain/entities/source";
import MessageRole from "../../domain/valueObjects/MessageRole";

export interface UpdateMessageDto {
    id: string;
    content: string;
}

export interface SendMessageDto {
    chatId: string | null; // Opcional: si no existe, se crea nuevo chat
    content: string;
    mediaContent: null | {
        type: "image" | "audio" | "video" | "document";
        buffer: Buffer;
        filename: string;
        mimeType: string;
    };
}

export interface MessageResponseDto {
    chatId: string | null;
    messageId: string | null;
    role: MessageRole;
    timestamp: Date;
    content: {
        text: string;
        sources: null | Source[];
        mediaContent: null | {
            type: "image" | "audio" | "video" | "document";
            buffer: Buffer;
            filename: string;
            mimeType: string;
        };
    };
}
