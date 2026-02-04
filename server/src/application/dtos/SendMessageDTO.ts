export default interface SendMessageDto {
    chatId: string | null;
    content: string;
    mediaContent: null | {
        type: "image" | "audio" | "video" | "document";
        buffer: Buffer;
        filename: string;
        mimeType: string;
    };
}
