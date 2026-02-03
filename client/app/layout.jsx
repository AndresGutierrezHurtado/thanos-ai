"use client";

import { useEffect, useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastContainer } from "react-toastify";
import { usePathname } from "next/navigation";
import Link from "next/link";

// Hooks
import { useApi } from "../hooks/useApi";

// Styles
import "./globals.css";

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

    useEffect(() => {
        const fetchChats = async () => {
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
        };

        fetchChats();
    }, [pathname]);

    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <main className="min-h-screen flex bg-base-200 text-base-content">
                    <aside className="w-72 border-r border-base-300 bg-base-100 flex flex-col">
                        <Link
                            href="/"
                            className="p-4 border-b border-base-300 tooltip tooltip-right"
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
                                                className="w-full"
                                            >
                                                <span className="font-medium">
                                                    {chat.title ?? "Chat sin título"}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </aside>

                    <section className="flex-1 flex items-center justify-center px-6 py-10">
                        {children}
                    </section>
                </main>
                <ToastContainer />
            </body>
        </html>
    );
}
