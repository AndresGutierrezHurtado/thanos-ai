"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";

export default function ChatByIdPage() {
    const params = useParams();
    const chatId = useMemo(() => {
        const value = params?.id;
        return Array.isArray(value) ? value[0] : value ?? null;
    }, [params]);

    const [messages, setMessages] = useState([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [content, setContent] = useState("");
    const [isSending, setIsSending] = useState(false);

    const loadMessages = useCallback(async () => {
        if (!chatId) return;

        setMessagesLoading(true);
        try {
            const response = await useApi("GET", `/chats/${chatId}/messages`);
            if (!response?.success) {
                setMessages([]);
                return;
            }
            setMessages(response.data ?? []);
        } catch (error) {
            console.error("Failed to load messages", error);
            setMessages([]);
        } finally {
            setMessagesLoading(false);
        }
    }, [chatId]);

    useEffect(() => {
        loadMessages();
    }, [loadMessages]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!chatId) return;

        const formData = new FormData(event.currentTarget);
        const payload = Object.fromEntries(formData);
        const contentValue =
            typeof payload.content === "string" ? payload.content.trim() : "";

        if (!contentValue) return;

        setIsSending(true);
        try {
            const response = await useApi("POST", "/api/v1/messages", {
                chatId,
                content: contentValue,
                mediaContent: null,
            });

            if (response?.success) {
                setContent("");
                await loadMessages();
            }
        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="w-full max-w-3xl h-full flex flex-col">
            <div className="w-full flex-1 overflow-y-auto pr-2">
                {messagesLoading ? (
                    <div className="h-full flex items-center justify-center text-center text-sm opacity-70">
                        Cargando historial…
                    </div>
                ) : messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center text-sm opacity-70">
                        No hay mensajes todavía.
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 pb-4">
                        {messages.map((item, index) => {
                            const role = item.role ?? "assistant";
                            const isUser = role === "user";
                            const key =
                                item.messageId ??
                                item.id ??
                                `${item.role}-${item.timestamp}-${index}`;
                            const text = item.content?.text ?? "";

                            return (
                                <div
                                    key={key}
                                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-xl rounded-2xl border px-4 py-3 shadow-sm ${
                                            isUser
                                                ? "bg-primary text-primary-content border-primary"
                                                : "bg-base-100 border-base-300"
                                        }`}
                                    >
                                        <p className="text-sm opacity-70 mb-1">
                                            {isUser ? "Tú" : "Asistente"}
                                        </p>
                                        <p className="whitespace-pre-wrap">{text}</p>
                                        {item.timestamp && (
                                            <p className="mt-2 text-xs opacity-60 text-right">
                                                {new Date(item.timestamp).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <form
                onSubmit={handleSubmit}
                className="mt-6 rounded-full bg-base-100 border border-base-300 p-2 flex items-center gap-3 shadow-sm"
            >
                <input
                    name="content"
                    type="text"
                    placeholder="Escribe tu mensaje..."
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    className="input input-ghost flex-1 text-base focus:outline-none"
                    disabled={isSending}
                />
                <button
                    type="submit"
                    className="btn btn-primary px-8 rounded-full"
                    disabled={isSending}
                >
                    {isSending ? "Enviando..." : "Enviar"}
                </button>
            </form>
        </div>
    );
}
