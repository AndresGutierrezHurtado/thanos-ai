"use client";

import Markdown from "react-markdown";

export default function ChatMessageList({ messages = [], loading = false }) {
    if (loading) {
        return (
            <div className="h-full flex items-center justify-center text-center text-sm opacity-70">
                Cargando historial…
            </div>
        );
    }

    if (!messages.length) {
        return (
            <div className="h-full flex items-center justify-center text-center text-sm opacity-70">
                No hay mensajes todavía.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 pb-4">
            {messages.map((item, index) => {
                return (
                    <ChatMessageItem
                        key={item.messageId ?? item.id ?? `${item.role}-${item.timestamp}-${index}`}
                        message={item}
                    />
                );
            })}
        </div>
    );
}

function ChatMessageItem({ message }) {
    const role = message.role ?? "assistant";
    const isUser = role === "user";

    return (
        <div className={`chat ${isUser ? "chat-end" : "chat-start"}`}>
            <div className="chat-image avatar">
                <div className="w-10 rounded-full">
                    <img
                        alt={`Imagen del ${isUser ? "usuario" : "asistente"}`}
                        src={isUser ? "/user.jpg" : "/assistant.png"}
                    />
                </div>
            </div>
            <div className="chat-header flex items-center gap-2">
                <span className="text-base">{isUser ? "Tú" : "Asistente"}</span>
                <time className="text-xs opacity-50">
                    {new Date(message.timestamp).toLocaleString()}
                </time>
            </div>
            <div
                className={`chat-bubble ${
                    isUser ? "bg-primary text-primary-content" : "bg-base-300 text-base-content"
                }`}
            >
                {isUser ? <>{message.content.text}</> : <Markdown>{message.content.text}</Markdown>}
            </div>
        </div>
    );
}
