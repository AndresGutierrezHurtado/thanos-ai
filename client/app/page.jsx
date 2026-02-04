"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import ChatInput from "@/components/ChatInput";
import { toast } from "react-toastify";

export default function Page() {
    const router = useRouter();
    const [content, setContent] = useState("");
    const [file, setFile] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleFileChange = (event) => {
        const selected = event.target.files?.[0] ?? null;
        setFile(selected);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const trimmedContent = content.trim();
        if (!trimmedContent) return toast.error("El contenido no puede estar vacío");

        setIsCreating(true);
        try {
            const response = await useApi("POST", "/chats", {
                content: trimmedContent,
                mediaContent: null,
            });

            if (!response.success) return toast.error(response.message);
            setContent("");
            setFile(null);

            router.push(`/chat/${response.data.chatId}`);
        } catch (error) {
            console.error("Failed to create chat", error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="w-full max-w-3xl space-y-10">
                <div className="space-y-2">
                    <h1 className="text-4xl font-semibold tracking-tight scale-y-105">
                        ¡Bienvenido a Thanos AI!
                    </h1>
                    <p className="text-xl opacity-70 scale-y-105 font-light pb-4">
                        Aquí podrás solicitar información de tus documentos.
                    </p>
                    <div className="w-full grid grid-cols-2 gap-4">
                        <article
                            className="w-full border border-neutral-content/10 rounded-lg p-4 cursor-pointer hover:bg-neutral-content/10 transition-colors duration-300"
                            onClick={() => {
                                setContent("Comparteme la informacion de TI");
                                handleSubmit({
                                    preventDefault: () => {},
                                });
                            }}
                        >
                            <div className="w-full flex gap-2 items-center justify-center">
                                <div className="flex flex-col text-center">
                                    <p className="text-sm font-semibold">Informacion de TI</p>
                                    <p className="text-xs opacity-70">
                                        Obtener información del departamento de TI
                                    </p>
                                </div>
                            </div>
                        </article>
                        <article
                            className="w-full border border-neutral-content/10 rounded-lg p-4 cursor-pointer hover:bg-neutral-content/10 transition-colors duration-300"
                            onClick={() => {
                                setContent("Comparteme la informacion de Calidad");
                                handleSubmit({
                                    preventDefault: () => {},
                                });
                            }}
                        >
                            <div className="w-full flex gap-2 items-center justify-center">
                                <div className="flex flex-col text-center">
                                    <p className="text-sm font-semibold">Informacion de Calidad</p>
                                    <p className="text-xs opacity-70">
                                        Obtener información del departamento de Calidad
                                    </p>
                                </div>
                            </div>
                        </article>
                        <article
                            className="w-full border border-neutral-content/10 rounded-lg p-4 cursor-pointer hover:bg-neutral-content/10 transition-colors duration-300"
                            onClick={() => {
                                setContent("Comparteme la informacion gerencial");
                                handleSubmit({
                                    preventDefault: () => {},
                                });
                            }}
                        >
                            <div className="w-full flex gap-2 items-center justify-center">
                                <div className="flex flex-col text-center">
                                    <p className="text-sm font-semibold">Informacion gerencial</p>
                                    <p className="text-xs opacity-70">
                                        Obtener información del departamento de Gerencia
                                    </p>
                                </div>
                            </div>
                        </article>
                        <article
                            className="w-full border border-neutral-content/10 rounded-lg p-4 cursor-pointer hover:bg-neutral-content/10 transition-colors duration-300"
                            onClick={() => {
                                setContent("Comparteme la informacion de seguridad");
                                handleSubmit({
                                    preventDefault: () => {},
                                });
                            }}
                        >
                            <div className="w-full flex gap-2 items-center justify-center">
                                <div className="flex flex-col text-center">
                                    <p className="text-sm font-semibold">Informacion de Dir Estratégica</p>
                                    <p className="text-xs opacity-70">
                                        Obtener información del departamento de Dir Estratégica
                                    </p>
                                </div>
                            </div>
                        </article>
                    </div>
                </div>
                <ChatInput
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    onSubmit={handleSubmit}
                    disabled={isCreating}
                    file={file}
                    onChangeFile={handleFileChange}
                />
            </div>
        </div>
    );
}
