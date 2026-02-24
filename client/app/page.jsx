"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ChatInput from "@/components/ChatInput";
import { toast } from "react-toastify";
import { streamRequest } from "@/lib/streamRequest";
import toBase64 from "@/lib/toBase64";

export default function Page() {
    const router = useRouter();
    const [content, setContent] = useState("");
    const [file, setFile] = useState(null);
    const [provider, setProvider] = useState("gpt");
    const [isCreating, setIsCreating] = useState(false);
    const [streamingText, setStreamingText] = useState("");

    const handleFileChange = (e) => {
        const selected = e?.target?.files?.[0] ?? null;
        setFile(selected);
    };

    const handleSubmit = async (e, text) => {
        e?.preventDefault();

        const trimmedContent = text ?? content.trim();
        const mediaContent =
            file && file.size > 0
                ? {
                      type: "document",
                      buffer: await toBase64(file),
                      filename: file.name,
                      mimeType: file.type,
                      size: file.size,
                  }
                : null;

        if (!trimmedContent) return toast.error("El contenido no puede estar vacío");

        setIsCreating(true);
        setStreamingText("");
        try {
            await streamRequest(
                "POST",
                "/chats",
                { content: trimmedContent, mediaContent, provider },
                {
                    onChunk: (chunk) => setStreamingText((prev) => prev + chunk),
                    onFinal: (data) => {
                        setContent("");
                        setFile(null);
                        if (data?.chatId) {
                            router.push(`/chat/${data.chatId}`);
                        } else {
                            toast.error("No se recibió el chat");
                        }
                    },
                },
            );
        } catch (error) {
            console.error("Failed to create chat", error);
            toast.error("Error al crear el chat");
        } finally {
            setIsCreating(false);
            setStreamingText("");
        }
    };

    return (
        <div className="w-full h-full flex items-center justify-center px-5">
            <div className="w-full max-w-3xl space-y-10">
                <div className="space-y-2">
                    <h1 className="text-4xl font-semibold tracking-tight scale-y-105">
                        ¡Bienvenido a Thanos AI!
                    </h1>
                    <p className="text-xl opacity-70 scale-y-105 font-light pb-4">
                        Aquí podrás solicitar información de tus documentos.
                    </p>
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <article
                            className="w-full border border-neutral-content/10 rounded-lg p-4 cursor-pointer hover:bg-neutral-content/10 transition-colors duration-300"
                            onClick={() => {
                                handleSubmit(null, "Comparteme la informacion del area de TI");
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
                                handleSubmit(null, "Comparteme la informacion del area de Calidad");
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
                                handleSubmit(null, "Comparteme la informacion gerencial");
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
                                handleSubmit(
                                    null,
                                    "Comparteme la informacion del area de dirección estratégica",
                                );
                            }}
                        >
                            <div className="w-full flex gap-2 items-center justify-center">
                                <div className="flex flex-col text-center">
                                    <p className="text-sm font-semibold">
                                        Informacion de Dir Estratégica
                                    </p>
                                    <p className="text-xs opacity-70">
                                        Obtener información del departamento de Dir Estratégica
                                    </p>
                                </div>
                            </div>
                        </article>
                    </div>
                </div>
                {isCreating && (
                    <div className="w-full rounded-lg border border-neutral-content/10 bg-neutral-content/5 p-4 min-h-[80px]">
                        <p className="text-sm opacity-70 mb-2">Generando respuesta…</p>
                        {streamingText && (
                            <p className="text-sm whitespace-pre-wrap">{streamingText}</p>
                        )}
                    </div>
                )}
                <ChatInput
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    onSubmit={handleSubmit}
                    provider={provider}
                    onProviderChange={setProvider}
                    disabled={isCreating}
                    file={file}
                    onChangeFile={handleFileChange}
                />
            </div>
        </div>
    );
}
