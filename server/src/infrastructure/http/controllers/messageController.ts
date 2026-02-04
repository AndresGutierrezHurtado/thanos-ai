import { Request, Response } from "express";

// Use Cases
import MessageUseCase from "../../../application/useCases/MessageUseCase";

export default class MessageController {
    constructor(private readonly messageUseCase: MessageUseCase) {}

    public async sendMessage(req: Request, res: Response): Promise<Response | void> {
        const { chatId, content, mediaContent, stream: useStream } = req.body;

        if (useStream) {
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.flushHeaders?.();
            const onChunk = (text: string) => {
                res.write(`data: ${JSON.stringify({ text })}\n\n`);
            };
            const message = await this.messageUseCase.sendMessage(
                { chatId, content, mediaContent },
                onChunk
            );
            res.write(`data: ${JSON.stringify({ success: true, message: "Message sent successfully", data: message })}\n\n`);
            res.end();
            return;
        }

        const message = await this.messageUseCase.sendMessage({ chatId, content, mediaContent });
        return res.status(200).json({
            success: true,
            message: "Message sent successfully",
            data: message
        });
    }
}