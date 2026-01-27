import Identifier from "../../domain/valueObjects/Identifier";

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
    chatId: Identifier | null;
    messageId: Identifier | null;
    assistantMessage: {
        content: string;
        timestamp: Date;
        sources: null | Array<{
            norm: string;
            section: string;
            content: string;
        }>;
    };
}
