import { LlmProviderName } from "../services/ILlmProvider";

export default interface SendMessageDto {
    chatId: string | null;
    content: string;
    provider?: LlmProviderName;
    mediaContent: null | {
        type: "image" | "audio" | "video" | "document";
        buffer: Buffer;
        filename: string;
        mimeType: string;
        size: number;
    };
}
