"use client";

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
                const role = item.role ?? "assistant";
                const isUser = role === "user";
                const key = item.messageId ?? item.id ?? `${item.role}-${item.timestamp}-${index}`;
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
    );
}
