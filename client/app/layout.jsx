"use client";

import { useCallback, useEffect, useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastContainer } from "react-toastify";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";

// Hooks
import { useApi } from "../hooks/useApi";

// Styles
import "./globals.css";
import { TrashIcon } from "lucide-react";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export default function RootLayout({ children }) {
    const [chats, setChats] = useState([]);
    const [loadingChats, setLoadingChats] = useState(true);

    const pathname = usePathname();

    const fetchChats = useCallback(async () => {
        try {
            const response = await useApi("GET", "/chats");

            if (!response?.success) {
                setChats([]);
                return;
            }

            setChats(response.data ?? []);
        } catch (error) {
            console.error("Failed to load chats", error);
            setChats([]);
        } finally {
            setLoadingChats(false);
        }
    }, [pathname]);

    useEffect(() => {
        fetchChats();
    }, [pathname]);

    const handleDeleteChat = async (e, chat) => {
        e.preventDefault();
        e.stopPropagation();

        const result = await Swal.fire({
            title: "¿Eliminar conversación?",
            text: `Se eliminará "${chat.title ?? "Chat sin título"}" permanentemente.`,
            icon: "warning",
            showCancelButton: true,
            background: "var(--color-base-100)",
            color: "var(--color-base-content)",
            confirmButtonColor: "var(--color-primary)",
            cancelButtonColor: "var(--color-secondary)",
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
        });

        if (!result.isConfirmed) return;

        const response = await useApi("DELETE", `/chats/${chat.id}`, null, true);

        if (!response?.success) return;

        fetchChats();
    };

    return (
        <html lang="en">
            <head>
                <title>THANOS AI | Gestor de documentos</title>
                <link rel="icon" href="/assistant.png" />
            </head>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <main className="min-h-screen flex bg-base-100 text-base-content">
                    <aside className="w-72 border-r border-neutral-content/10 bg-neutral text-neutral-content flex flex-col">
                        <Link
                            href="/"
                            className="p-4 border-b border-neutral-content/10 tooltip tooltip-right"
                            data-tip="Crear nueva conversación"
                        >
                            <p className="text-3xl font-extrabold">
                                THANOS <span className="text-primary italic">AI</span>
                            </p>
                            <p className="text-sm opacity-70">Gestor de documentos</p>
                        </Link>

                        <div className="flex-1 overflow-y-auto">
                            {loadingChats && (
                                <div className="p-4 text-sm opacity-70">
                                    Cargando conversaciones…
                                </div>
                            )}

                            {!loadingChats && chats.length === 0 && (
                                <div className="p-4 text-sm opacity-70">
                                    Aún no hay conversaciones registradas.
                                </div>
                            )}

                            {!loadingChats && chats.length > 0 && (
                                <ul className="menu w-full p-2 gap-1">
                                    {chats.map((chat) => (
                                        <li key={chat.id} className="w-full">
                                            <Link
                                                href={`/chat/${chat.id}`}
                                                className="w-full rounded-lg flex items-center justify-between group"
                                            >
                                                <span className="font-medium">
                                                    {chat.title ?? "Chat sin título"}
                                                </span>
                                                <button
                                                    className="btn btn-ghost w-8 h-8 rounded p-0 tooltip tooltip-bottom opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                                    data-tip="Eliminar conversación"
                                                    onClick={(e) => handleDeleteChat(e, chat)}
                                                >
                                                    <TrashIcon size={15} />
                                                </button>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </aside>

                    <section className="flex-1 h-screen overflow-hidden">{children}</section>
                </main>
                <ToastContainer />
            </body>
        </html>
    );
}
