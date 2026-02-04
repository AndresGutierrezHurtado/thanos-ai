import { Request, Response } from "express";

// Use Cases
import MessageUseCase from "../../../application/useCases/MessageUseCase";
import { UpdateMessageDto } from "../../../application/dtos/SendMessageDTO";

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
            res.write(
                `data: ${JSON.stringify({
                    success: true,
                    message: "Message sent successfully",
                    data: message,
                })}\n\n`
            );
            res.end();
            return;
        }

        const message = await this.messageUseCase.sendMessage({ chatId, content, mediaContent });
        return res.status(200).json({
            success: true,
            message: "Message sent successfully",
            data: message,
        });
    }

    public async updateMessage(req: Request, res: Response): Promise<Response | void> {
        const idRaw = req.params.id;
        const id = Array.isArray(idRaw) ? idRaw[0] : idRaw ?? "";
        const { content, stream: useStream } = req.body;
        const dto: UpdateMessageDto = { id, content };

        if (useStream) {
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.flushHeaders?.();
            const onChunk = (text: string) => {
                res.write(`data: ${JSON.stringify({ text })}\n\n`);
            };
            const result = await this.messageUseCase.updateMessage(dto, onChunk);
            res.write(
                `data: ${JSON.stringify({
                    success: true,
                    message: "Message updated successfully",
                    data: result,
                })}\n\n`
            );
            res.end();
            return;
        }

        const result = await this.messageUseCase.updateMessage(dto);
        return res.status(200).json({
            success: true,
            message: "Message updated successfully",
            data: result,
        });
    }

    public async speechToText(req: Request, res: Response): Promise<Response | void> {
        const { audio } = req.body as { audio: string };
        const result = await this.messageUseCase.speechToText(Buffer.from(audio, "base64"));
        return res.status(200).json({
            success: true,
            message: "Speech to text completed successfully",
            data: result,
        });
    }
}
