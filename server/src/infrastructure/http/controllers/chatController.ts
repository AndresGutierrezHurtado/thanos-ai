import { Request, Response } from "express";

// Use Cases
import ChatUseCase from "../../../application/useCases/chatUseCase";
import MessageUseCase from "../../../application/useCases/MessageUseCase";

// DTOs
import SendMessageDto from "../../../application/ports/dtos/SendMessageDTO";

export default class ChatController {
    private readonly MAX_MEDIA_CONTENT_SIZE = 7 * 1024 * 1024; // 7MB

    constructor(
        private readonly chatUseCase: ChatUseCase,
        private readonly messageUseCase: MessageUseCase
    ) {}

    public async getChats(req: Request, res: Response): Promise<Response> {
        const chats = await this.chatUseCase.getChats();
        return res.status(200).json({
            success: true,
            message: "Chats fetched successfully",
            data: chats,
        });
    }

    public async getMessagesByChatId(req: Request, res: Response): Promise<Response> {
        const { id } = req.params;
        const messages = await this.messageUseCase.getMessagesByChatId(id as string);
        return res.status(200).json({
            success: true,
            message: "Messages fetched successfully",
            data: messages ?? [],
        });
    }

    public async getChatById(req: Request, res: Response): Promise<Response> {
        const { id } = req.params;
        const chat = await this.chatUseCase.getChatById(id as string);

        return res.status(200).json({
            success: true,
            message: "Chat fetched successfully",
            data: chat,
        });
    }

    public async createChat(req: Request, res: Response): Promise<Response | void> {
        const { content, mediaContent, stream: useStream } = req.body;

        if (mediaContent && mediaContent?.size > this.MAX_MEDIA_CONTENT_SIZE) {
            throw new Error(`Media content size exceeds the maximum allowed size of ${this.MAX_MEDIA_CONTENT_SIZE / 1024 / 1024}MB`);
        }

        const dto: SendMessageDto = {
            chatId: null,
            content,
            mediaContent: mediaContent,
        };

        if (useStream) {
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.flushHeaders?.();
            const onChunk = (text: string) => {
                res.write(`data: ${JSON.stringify({ text })}\n\n`);
            };
            const chat = await this.chatUseCase.createChat(dto, onChunk);
            res.write(
                `data: ${JSON.stringify({
                    success: true,
                    message: "Chat created successfully",
                    data: chat,
                })}\n\n`
            );
            res.end();
            return;
        }

        const chat = await this.chatUseCase.createChat(dto);
        return res.status(200).json({
            success: true,
            message: "Chat created successfully",
            data: chat,
        });
    }

    public async deleteChat(req: Request, res: Response): Promise<Response> {
        const { id } = req.params;
        await this.chatUseCase.deleteChat(id as string);
        return res.status(200).json({
            success: true,
            message: "Chat deleted successfully",
        });
    }
}
