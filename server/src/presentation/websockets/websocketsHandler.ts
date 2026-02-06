import { Server } from "socket.io";
import DIContainer from "../../infrastructure/config/DIContainer";

export function registerWebSocketHandler(io: Server) {
    io.on("connection", (socket) => {
        let roomId: string | null = null;

        socket.on("speech", async (payload: { chatId: string; audio: string }) => {
            try {
                console.log("speech", payload);
                const container = await DIContainer.getInstance();
                const speechUseCase = container.getSpeechUseCase();
                const audioBuffer = Buffer.from(payload.audio, "base64");
                const responseAudio = await speechUseCase.execute(payload.chatId, audioBuffer);
                socket.emit("speech-response", { audio: responseAudio.toString("base64") });
            } catch (err) {
                socket.emit("speech-error", { message: err instanceof Error ? err.message : "Speech failed" });
            }
        });

        socket.on("join-room", (chatId: string) => {
            console.log("join-room", chatId);
            roomId = chatId;
            socket.join(roomId);
            socket.to(roomId).emit("peer-joined", { peerId: socket.id });
        });

        socket.on("offer", (payload: { sdp: object }) => {
            console.log("offer", payload);
            if (roomId) socket.to(roomId).emit("offer", { from: socket.id, ...payload });
        });

        socket.on("answer", (payload: { to: string; sdp: object }) => {
            console.log("answer", payload);
            io.to(payload.to).emit("answer", { from: socket.id, sdp: payload.sdp });
        });

        socket.on("ice-candidate", (payload: { to: string; candidate: object }) => {
            console.log("ice-candidate", payload);
            io.to(payload.to).emit("ice-candidate", { from: socket.id, ...payload });
        });

        socket.on("disconnect", () => {
            console.log("disconnect", roomId);
            if (roomId) socket.to(roomId).emit("peer-left", { peerId: socket.id });
        });
    });
}
