import { Request, Response } from "express";

// Use Cases
import MessageUseCase from "../../../application/useCases/MessageUseCase";

export default class MessageController {
    constructor(private readonly messageUseCase: MessageUseCase) {}

    public async sendMessage(req: Request, res: Response): Promise<Response> {
        const { chatId, content, mediaContent } = req.body;
        const message = await this.messageUseCase.sendMessage({ chatId, content, mediaContent });
        return res.status(200).json({
            success: true,
            message: "Message sent successfully",
            data: message
        });
    }
}