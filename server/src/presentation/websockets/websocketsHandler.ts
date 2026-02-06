import { Server } from "socket.io";
import DIContainer from "../../infrastructure/config/DIContainer";

const log = (event: string, data: unknown) => {
    console.log("[WS]", event, JSON.stringify(data, (_, v) => (typeof v === "string" && v.length > 80 ? `${v.slice(0, 80)}...(${v.length})` : v)));
};

export function registerWebSocketHandler(io: Server) {
    io.on("connection", (socket) => {
        log("connection", { socketId: socket.id });

        socket.on("speech", async (payload: { chatId: string; audio: string }) => {
            try {
                log("speech", { chatId: payload.chatId, audioLength: payload.audio?.length ?? 0 });
                const container = await DIContainer.getInstance();
                const speechUseCase = container.getSpeechUseCase();
                const audioBuffer = Buffer.from(payload.audio, "base64");
                const responseAudio = await speechUseCase.execute(payload.chatId, audioBuffer);
                const b64 = responseAudio.toString("base64");
                log("speech-response", { audioLength: b64.length });
                socket.emit("speech-response", { audio: b64 });
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Speech failed";
                log("speech-error", { message: msg });
                socket.emit("speech-error", { message: msg });
            }
        });

        socket.on("disconnect", () => {
            log("disconnect", { socketId: socket.id });
        });
    });
}
