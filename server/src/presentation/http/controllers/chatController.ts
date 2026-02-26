import { Request, Response } from "express";

// Use Cases
import ChatUseCase from "../../../application/useCases/chatUseCase";
import MessageUseCase from "../../../application/useCases/MessageUseCase";

// DTOs
import SendMessageDto from "../../../application/ports/dtos/SendMessageDTO";
import { LlmProviderName } from "../../../application/ports/services/ILlmProvider";

export default class ChatController {
    private readonly MAX_MEDIA_CONTENT_SIZE = 7 * 1024 * 1024; // 7MB

    private normalizeProvider(provider: unknown): LlmProviderName {
        return provider === "ollama" ? "ollama" : "gpt";
    }

    constructor(
        private readonly chatUseCase: ChatUseCase,
        private readonly messageUseCase: MessageUseCase,
    ) {}

    public async getChats(req: Request, res: Response): Promise<Response> {
        const userId = (res.locals as { userId?: string }).userId;
        const chats = await this.chatUseCase.getChats(userId);
        return res.status(200).json({
            success: true,
            message: "Chats fetched successfully",
            data: chats,
        });
    }

    public async getMessagesByChatId(req: Request, res: Response): Promise<Response> {
        const { id } = req.params;
        const userId = (res.locals as { userId?: string }).userId;
        const messages = await this.messageUseCase.getMessagesByChatId(id as string, userId);
        return res.status(200).json({
            success: true,
            message: "Messages fetched successfully",
            data: messages ?? [],
        });
    }

    public async getChatById(req: Request, res: Response): Promise<Response> {
        const { id } = req.params;
        const userId = (res.locals as { userId?: string }).userId;
        const chat = await this.chatUseCase.getChatById(id as string, userId);

        return res.status(200).json({
            success: true,
            message: "Chat fetched successfully",
            data: chat,
        });
    }

    public async createChat(req: Request, res: Response): Promise<Response | void> {
        const { content, mediaContent, provider, stream: useStream } = req.body;

        if (mediaContent?.size > this.MAX_MEDIA_CONTENT_SIZE) {
            throw new Error(
                `Media content size exceeds the maximum allowed size of ${this.MAX_MEDIA_CONTENT_SIZE / 1024 / 1024}MB`,
            );
        }

        let normalizedMedia: SendMessageDto["mediaContent"] = null;
        if (mediaContent && (mediaContent.buffer != null || mediaContent.data != null)) {
            const raw = mediaContent.buffer ?? mediaContent.data;
            const buf = typeof raw === "string"
                ? Buffer.from(raw, "base64")
                : Buffer.isBuffer(raw)
                    ? raw
                    : Buffer.from(raw);
            if (buf.length > 0) {
                normalizedMedia = { ...mediaContent, buffer: buf };
            }
        }

        const dto: SendMessageDto = {
            chatId: null,
            content: content ?? "",
            provider: this.normalizeProvider(provider),
            mediaContent: normalizedMedia ?? null,
        };

        const userId = (res.locals as { userId?: string }).userId;
        if (useStream) {
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.flushHeaders?.();
            const onChunk = (text: string) => {
                res.write(`data: ${JSON.stringify({ text })}\n\n`);
            };
            const chat = await this.chatUseCase.createChat(dto, onChunk, userId);
            res.write(
                `data: ${JSON.stringify({
                    success: true,
                    message: "Chat created successfully",
                    data: chat,
                })}\n\n`,
            );
            res.end();
            return;
        }

        const chat = await this.chatUseCase.createChat(dto, undefined, userId);
        return res.status(200).json({
            success: true,
            message: "Chat created successfully",
            data: chat,
        });
    }

    public async deleteChat(req: Request, res: Response): Promise<Response> {
        const { id } = req.params;
        const userId = (res.locals as { userId?: string }).userId;
        await this.chatUseCase.deleteChat(id as string, userId);
        return res.status(200).json({
            success: true,
            message: "Chat deleted successfully",
        });
    }
}
