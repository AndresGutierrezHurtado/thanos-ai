"use client";

import { useEffect, useMemo, useState } from "react";
import { useApi } from "../hooks/useApi";

export default function Page() {
    const [chats, setChats] = useState([]);
    const [loadingChats, setLoadingChats] = useState(true);
    const [selectedChatId, setSelectedChatId] = useState(null);
    const [message, setMessage] = useState("");

    useEffect(() => {
        const fetchChats = async () => {
            setLoadingChats(true);

            try {
                const response = await useApi("GET", "/chats");

                if (!response?.success) {
                    setChats([]);
                    return;
                }

                setChats(response.data ?? []);
                setSelectedChatId(response.data?.[0]?.id ?? null);
            } catch (error) {
                console.error("Failed to load chats", error);
                setChats([]);
            } finally {
                setLoadingChats(false);
            }
        };

        fetchChats();
    }, []);

    const selectedChat = useMemo(
        () => chats.find((chat) => chat.id === selectedChatId) ?? null,
        [chats, selectedChatId]
    );

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!message.trim()) return;
        // TODO: Integrar con endpoint de mensajes cuando esté disponible.
    };

    return (
        <main className="min-h-screen flex bg-base-200 text-base-content">
            <aside className="w-72 border-r border-base-300 bg-base-100 flex flex-col">
                <div className="p-4 border-b border-base-300">
                    <p className="text-lg font-semibold">Tus chats</p>
                    <p className="text-sm opacity-70">Sincronizados desde el backend</p>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingChats && (
                        <div className="p-4 text-sm opacity-70">Cargando conversaciones…</div>
                    )}

                    {!loadingChats && chats.length === 0 && (
                        <div className="p-4 text-sm opacity-70">
                            Aún no hay conversaciones registradas.
                        </div>
                    )}

                    {!loadingChats && chats.length > 0 && (
                        <ul className="menu menu-sm p-2 gap-1">
                            {chats.map((chat) => (
                                <li key={chat.id}>
                                    <button
                                        type="button"
                                        className={`justify-start rounded-lg ${
                                            selectedChatId === chat.id ? "active" : ""
                                        }`}
                                        onClick={() => setSelectedChatId(chat.id)}
                                    >
                                        <span className="font-medium">
                                            {chat.title ?? "Chat sin título"}
                                        </span>
                                        <span className="text-xs opacity-70">
                                            {chat.updatedAt
                                                ? new Date(chat.updatedAt).toLocaleString()
                                                : "Sin fecha"}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </aside>

            <section className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-6">
                <header className="w-full max-w-3xl text-center">
                    <p className="text-sm uppercase tracking-wide opacity-70">Asistente</p>
                    <h1 className="text-3xl font-semibold">
                        {selectedChat?.title ?? "Selecciona un chat para comenzar"}
                    </h1>
                </header>

                <div className="w-full max-w-3xl flex-1 flex flex-col gap-4">
                    <div className="flex-1 rounded-2xl bg-base-100 border border-base-300 p-6 flex items-center justify-center text-center">
                        <p className="opacity-70">
                            {selectedChat
                                ? "Aquí se mostrarán los mensajes del chat seleccionado."
                                : "Selecciona una conversación desde la barra lateral o crea una nueva."}
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="rounded-full bg-base-100 border border-base-300 p-2 flex items-center gap-3 shadow-sm"
                    >
                        <input
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
            </section>
        </main>
    );
}
