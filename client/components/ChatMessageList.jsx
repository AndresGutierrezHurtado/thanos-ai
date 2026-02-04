"use client";

import {
    CopyIcon,
    LoaderIcon,
    PenIcon,
    RefreshCcwIcon,
    Sparkles,
    Square,
    Volume2Icon,
} from "lucide-react";
import Markdown from "react-markdown";
import React, { useState } from "react";
import { toast } from "react-toastify";

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
        <div className="flex flex-col max-w-3xl mx-auto gap-5 pb-4">
            {messages.map((item, index) => {
                return (
                    <React.Fragment key={index}>
                        {item.role === "assistant" ? (
                            <AssistantMessage
                                key={
                                    item.messageId ??
                                    item.id ??
                                    `${item.role}-${item.timestamp}-${index}`
                                }
                                message={item}
                            />
                        ) : (
                            <UserMessage
                                key={
                                    item.messageId ??
                                    item.id ??
                                    `${item.role}-${item.timestamp}-${index}`
                                }
                                message={item}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

function AssistantMessage({ message }) {
    const [isSpeaking, setIsSpeaking] = useState(false);

    const handlePlayStop = () => {
        if (isSpeaking) {
            speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }
        const text = message.content.text.replaceAll("**", "");
        if (!text.trim()) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "es-ES";
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    };

    return (
        <div className="w-full flex flex-col gap-5 relative">
            <div className="flex items-center gap-2 text-primary">
                <Sparkles size={20} />
                <p className="text-sm scale-y-105 font-semibold">Thanos AI</p>
            </div>
            <div className="flex flex-col gap-2 w-full">
                <div className="w-fit overflow-x-clip text-ellipsis flex items-center gap-2 flex-wrap">
                    <Markdown>{message.content.text}</Markdown>
                    {message.streaming && (
                        <LoaderIcon size={18} className="animate-spin shrink-0 inline-block" />
                    )}
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    className="btn btn-ghost w-8 h-8 rounded p-0 tooltip tooltip-bottom"
                    data-tip="Copiar respuesta"
                    onClick={() => {
                        navigator.clipboard.writeText(message.content.text);
                        toast.success("Respuesta copiada al portapapeles");
                    }}
                >
                    <CopyIcon size={15} />
                </button>
                <button
                    className="btn btn-ghost w-8 h-8 rounded p-0 tooltip tooltip-bottom"
                    data-tip={isSpeaking ? "Detener" : "Reproducir audio"}
                    onClick={handlePlayStop}
                >
                    {isSpeaking ? (
                        <Square size={15} className="fill-current" />
                    ) : (
                        <Volume2Icon size={15} />
                    )}
                </button>
                <button
                    className="btn btn-ghost w-8 h-8 rounded p-0 tooltip tooltip-bottom"
                    data-tip="Recargar respuesta"
                    onClick={() => {
                        // TODO: Recargar respuesta
                    }}
                >
                    <RefreshCcwIcon size={15} />
                </button>
            </div>
        </div>
    );
}

function UserMessage({ message }) {
    return (
        <div className="w-full flex gap-2 justify-end group">
            <div className="group-hover:opacity-100 opacity-0 transition-opacity duration-300">
                <button className="btn btn-ghost w-8 h-8 rounded p-0">
                    <CopyIcon size={15} />
                </button>
                <button className="btn btn-ghost w-8 h-8 rounded p-0">
                    <PenIcon size={15} />
                </button>
            </div>
            <div className="w-fit max-w-xl rounded-2xl rounded-tr bg-primary text-primary-content p-4 overflow-x-clip text-ellipsis">
                {message.content.text}
            </div>
        </div>
    );
}
