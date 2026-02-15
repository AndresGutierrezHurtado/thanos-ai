"use client";

import { useCallback, useEffect, useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastContainer } from "react-toastify";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useApi } from "../hooks/useApi";
import { PeerProvider } from "@/components/Peer";

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

function LayoutContent({ children }) {
    const [chats, setChats] = useState([]);
    const [loadingChats, setLoadingChats] = useState(true);
    const { isAuthenticated, loading: authLoading, user, logout } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated && pathname !== "/login") {
            router.replace("/login");
            return;
        }
    }, [isAuthenticated, pathname, router]);

    const fetchChats = useCallback(async () => {
        if (!isAuthenticated) {
            setChats([]);
            setLoadingChats(false);
            return;
        }
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
    }, [pathname, isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchChats();
        } else {
            setLoadingChats(false);
            setChats([]);
        }
    }, [pathname, isAuthenticated, fetchChats]);

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

        if (pathname.includes(`/chat/${chat.id}`)) {
            router.push("/");
        }

        fetchChats();
    };

    if (authLoading || (!isAuthenticated && pathname !== "/login")) {
        return (
            <html lang="en">
                <head>
                    <title>Thanos AI | Gestor de documentos</title>
                    <link rel="icon" href="/assistant.png" />
                </head>
                <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                    <div className="min-h-screen flex items-center justify-center bg-base-100">
                        <span className="loading loading-spinner loading-lg text-primary" />
                    </div>
                </body>
            </html>
        );
    }

    if (pathname === "/login") {
        return (
            <html lang="en">
                <head>
                    <title>Thanos AI | Iniciar sesión</title>
                    <link rel="icon" href="/assistant.png" />
                </head>
                <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                    <ToastContainer />
                    {children}
                </body>
            </html>
        );
    }

    return (
        <html lang="en">
            <head>
                <title>Thanos AI | Gestor de documentos</title>
                <link rel="icon" href="/assistant.png" />
            </head>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <div className="drawer lg:drawer-open">
                    <input id="app-drawer" type="checkbox" className="drawer-toggle" />

                    {/* CONTENIDO PRINCIPAL */}
                    <div className="drawer-content flex flex-col bg-base-100 text-base-content h-screen overflow-hidden">
                        {/* Navbar superior (mobile) */}
                        <div className="navbar bg-base-300 border-b border-neutral-content/10 lg:hidden">
                            <div className="flex-none">
                                <label
                                    htmlFor="app-drawer"
                                    aria-label="open sidebar"
                                    className="btn btn-square btn-ghost"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        className="inline-block h-6 w-6 stroke-current"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M4 6h16M4 12h16M4 18h16"
                                        ></path>
                                    </svg>
                                </label>
                            </div>
                            <div className="mx-2 flex-1 px-2">
                                <Link href="/" className="flex flex-col">
                                    <span className="text-2xl font-extrabold">
                                        THANOS <span className="text-primary italic">AI</span>
                                    </span>
                                    <span className="text-xs opacity-70">Gestor de documentos</span>
                                </Link>
                            </div>
                        </div>

                        {/* Contenido de la página */}
                        <main className="flex-1 overflow-hidden">
                            <PeerProvider>{children}</PeerProvider>
                        </main>
                    </div>

                    {/* SIDEBAR (menú lateral) */}
                    <div className="drawer-side">
                        <label
                            htmlFor="app-drawer"
                            aria-label="close sidebar"
                            className="drawer-overlay"
                        ></label>

                        <aside className="w-72 lg:w-80 h-screen border-r border-neutral-content/10 bg-neutral text-neutral-content flex flex-col">
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

                            <div className="flex-1 overflow-y-auto overflow-x-hidden">
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
                                                    style={{
                                                        backgroundColor:
                                                            chat.id === pathname.split("/")[2]
                                                                ? "var(--color-base-200)"
                                                                : "transparent",
                                                    }}
                                                >
                                                    <span className="font-medium w-full line-clamp-2">
                                                        {chat.title ?? "Chat sin título"}
                                                    </span>
                                                    <button
                                                        className="btn btn-ghost w-8 h-8 rounded p-0 tooltip tooltip-bottom lg:opacity-0 group-hover:opacity-100 transition-opacity duration-300"
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

                            {user && (
                                <div className="p-3 border-t border-neutral-content/10 flex items-center justify-between gap-2">
                                    <div className="flex flex-col flex-1">
                                        <p
                                            className="text-sm truncate opacity-90"
                                            title={user.email}
                                        >
                                            {user.name?.trim() || user.email}
                                        </p>
                                        <p className="text-xs opacity-60 truncate">{user.email}</p>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={async () => {
                                            const result = await Swal.fire({
                                                title: "¿Cerrar sesión?",
                                                text: "Se cerrará tu sesión en Thanos AI.",
                                                icon: "question",
                                                showCancelButton: true,
                                                background: "var(--color-base-100)",
                                                color: "var(--color-base-content)",
                                                cancelButtonColor: "var(--color-primary)",
                                                confirmButtonColor: "var(--color-neutral)",
                                                confirmButtonText: "Sí, salir",
                                                cancelButtonText: "Cancelar",
                                            });
                                            if (!result.isConfirmed) return;
                                            logout();
                                            router.replace("/login");
                                        }}
                                        title="Cerrar sesión"
                                    >
                                        Salir
                                    </button>
                                </div>
                            )}
                        </aside>
                    </div>
                </div>

                <ToastContainer />
            </body>
        </html>
    );
}

export default function RootLayout({ children }) {
    return (
        <AuthProvider>
            <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
    );
}
