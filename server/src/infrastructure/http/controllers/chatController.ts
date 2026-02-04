import { Request, Response } from "express";

// Use Cases
import ChatUseCase from "../../../application/useCases/chatUseCase";
import MessageUseCase from "../../../application/useCases/MessageUseCase";

// DTOs
import SendMessageDto from "../../../application/dtos/SendMessageDTO";

export default class ChatController {
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

    public async createChat(req: Request, res: Response): Promise<Response> {
        const { content, mediaContent } = req.body;

        const dto: SendMessageDto = {
            chatId: null,
            content,
            mediaContent: mediaContent,
        };

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
