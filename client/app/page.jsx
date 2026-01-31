"use client";

import { useApi } from "../hooks/useApi";
import { useRouter } from "next/navigation";

export default function Page() {
    const router = useRouter();

    const handleSubmit = async (event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const data = Object.fromEntries(formData);

        if (!data.message?.trim()) return;

        const response = await useApi("POST", "/chats", {
            content: data.message,
        });

        if (!response.success) return;

        router.push(`/chat/${response.data.chatId}`);
    };

    return (
        <div className="w-full max-w-3xl">
            <form
                onSubmit={handleSubmit}
                className="rounded-full bg-base-100 border border-base-300 p-2 flex items-center gap-3 shadow-sm"
            >
                <input
                    name="message"
                    type="text"
                    placeholder="Escribe tu mensaje..."
                    className="input input-ghost flex-1 text-base focus:outline-none"
                />
                <button type="submit" className="btn btn-primary px-8 rounded-full">
                    Enviar
                </button>
            </form>
        </div>
    );
}
