"use client";

import { useState } from "react";

export default function ChatByIdPage() {
    const [message, setMessage] = useState("");
    const messages = [];

    const handleSubmit = (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const payload = Object.fromEntries(formData);
        if (!payload.message?.trim()) return;
        setMessage("");
    };

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center text-sm opacity-70">
                        No hay mensajes todavía.
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {messages.map((item, index) => (
                            <div key={`${item.id ?? "msg"}-${index}`} className="max-w-2xl">
                                <div className="rounded-2xl bg-base-100 border border-base-300 px-4 py-3 shadow-sm">
                                    {item.content}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <form
                onSubmit={handleSubmit}
                className="mt-6 rounded-full bg-base-100 border border-base-300 p-2 flex items-center gap-3 shadow-sm"
            >
                <input
                    name="message"
                    type="text"
                    placeholder="Escribe tu mensaje..."
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className="input input-ghost flex-1 text-base focus:outline-none"
                />
                <button type="submit" className="btn btn-primary px-8 rounded-full">
                    Enviar
                </button>
            </form>
        </div>
    );
}
