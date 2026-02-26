import { Request, Response } from "express";

// Use Cases
import MessageUseCase from "../../../application/useCases/MessageUseCase";
import SpeechUseCase from "../../../application/useCases/SpeechUseCase";
import { LlmProviderName } from "../../../application/ports/services/ILlmProvider";

export default class MessageController {
    private readonly MAX_MEDIA_CONTENT_SIZE = 7 * 1024 * 1024; // 7MB

    private normalizeProvider(provider: unknown): LlmProviderName {
        return provider === "ollama" ? "ollama" : "gpt";
    }

    constructor(
        private readonly messageUseCase: MessageUseCase,
        private readonly speechUseCase: SpeechUseCase,
    ) {}

    public async sendMessage(req: Request, res: Response): Promise<Response | void> {
        const { chatId, content, mediaContent, provider, stream: useStream } = req.body;
        const userId = (res.locals as { userId?: string }).userId;

        if (mediaContent?.size > this.MAX_MEDIA_CONTENT_SIZE) {
            throw new Error(
                `Media content size exceeds the maximum allowed size of ${this.MAX_MEDIA_CONTENT_SIZE / 1024 / 1024}MB`,
            );
        }

        if (mediaContent && mediaContent.buffer && mediaContent.buffer.length > 0) {
            mediaContent.buffer = Buffer.from(mediaContent.buffer, "base64");
        }

        if (useStream) {
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.flushHeaders?.();
            const onChunk = (text: string) => {
                res.write(`data: ${JSON.stringify({ text })}\n\n`);
            };
            const message = await this.messageUseCase.sendMessage(
                { chatId, content, mediaContent, provider: this.normalizeProvider(provider) },
                onChunk,
                userId,
            );
            res.write(
                `data: ${JSON.stringify({
                    success: true,
                    message: "Message sent successfully",
                    data: message,
                })}\n\n`,
            );
            res.end();
            return;
        }

        const message = await this.messageUseCase.sendMessage(
            { chatId, content, mediaContent, provider: this.normalizeProvider(provider) },
            undefined,
            userId,
        );

        return res.status(200).json({
            success: true,
            message: "Message sent successfully",
            data: message,
        });
    }

    public async updateMessage(req: Request, res: Response): Promise<Response | void> {
        const idRaw = req.params.id;
        const id = Array.isArray(idRaw) ? idRaw[0] : (idRaw ?? "");
        const { content, provider, stream: useStream } = req.body;
        const userId = (res.locals as { userId?: string }).userId;

        if (useStream) {
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.flushHeaders?.();
            const onChunk = (text: string) => {
                res.write(`data: ${JSON.stringify({ text })}\n\n`);
            };
            const result = await this.messageUseCase.updateMessage(
                { id, content, provider: this.normalizeProvider(provider) },
                onChunk,
                userId,
            );
            res.write(
                `data: ${JSON.stringify({
                    success: true,
                    message: "Message updated successfully",
                    data: result,
                })}\n\n`,
            );
            res.end();
            return;
        }

        const result = await this.messageUseCase.updateMessage(
            { id, content, provider: this.normalizeProvider(provider) },
            undefined,
            userId,
        );
        return res.status(200).json({
            success: true,
            message: "Message updated successfully",
            data: result,
        });
    }

    public async speechToText(req: Request, res: Response): Promise<Response | void> {
        const { audio } = req.body as { audio: string };
        const result = await this.speechUseCase.speechToText(Buffer.from(audio, "base64"));
        return res.status(200).json({
            success: true,
            message: "Speech to text completed successfully",
            data: result,
        });
    }
}
