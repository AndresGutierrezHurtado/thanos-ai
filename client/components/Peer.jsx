"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

const PeerContext = createContext(null);

const socketUrl =
    typeof window !== "undefined" && process.env.NEXT_PUBLIC_WS_URL
        ? process.env.NEXT_PUBLIC_WS_URL.replace(/^ws/, "http")
        : "http://localhost:4000";

export function usePeer() {
    const ctx = useContext(PeerContext);
    if (!ctx) throw new Error("usePeer must be used inside PeerProvider");
    return ctx;
}

export function PeerProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const [speechResponseAudio, setSpeechResponseAudio] = useState(null);
    const [speechError, setSpeechError] = useState(null);

    // Conectar socket
    useEffect(() => {
        const s = io(socketUrl, {
            autoConnect: true,
            transports: ["websocket", "polling"],
        });

        s.on("connect", () => {
            console.log("Socket conectado:", s.id);
        });

        s.on("connect_error", (err) => {
            console.error("Error de conexión:", err);
        });

        setSocket(s);

        return () => {
            s.disconnect();
        };
    }, []);

    // Escuchar eventos del servidor
    useEffect(() => {
        if (!socket) return;

        socket.on("speech-response", ({ audio }) => {
            console.log("Respuesta de audio recibida:", audio?.length);
            setSpeechError(null);
            setSpeechResponseAudio(audio ?? null);
        });

        socket.on("speech-error", ({ message }) => {
            console.error("Error de speech:", message);
            setSpeechResponseAudio(null);
            setSpeechError(message ?? "Speech failed");
        });

        return () => {
            socket.off("speech-response");
            socket.off("speech-error");
        };
    }, [socket]);

    // Función para enviar audio
    const sendSpeech = (chatId, audioBase64) => {
        if (!socket) {
            console.error("Socket no conectado");
            return;
        }

        if (!chatId || !audioBase64) {
            console.error("chatId o audioBase64 faltante");
            return;
        }

        setSpeechError(null);
        socket.emit("speech", { chatId, audio: audioBase64 });
    };

    const value = useMemo(
        () => ({
            socket,
            sendSpeech,
            speechResponseAudio,
            speechError,
            isConnected: socket?.connected ?? false,
        }),
        [socket, speechResponseAudio, speechError]
    );

    return <PeerContext.Provider value={value}>{children}</PeerContext.Provider>;
}
