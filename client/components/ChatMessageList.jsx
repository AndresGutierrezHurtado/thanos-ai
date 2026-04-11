"use client";

import React, { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "react-toastify";

// ICONS
import {
    CopyIcon,
    LoaderIcon,
    PenIcon,
    RefreshCcwIcon,
    Sparkles,
    Square,
    Volume2Icon,
} from "lucide-react";

// COMPONENTS
import PreviewDocumentModal from "./PreviewDocumentModal";

export default function ChatMessageList({
    messages = [],
    loading = false,
    disabled = false,
    onUpdateMessage,
    onRegenerateResponse,
}) {
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
                const userMessages = messages.slice(0, index).filter((m) => m.role === "user");
                const prevUserMessage = userMessages[userMessages.length - 1];
                return (
                    <React.Fragment key={index}>
                        {item.role === "assistant" ? (
                            <AssistantMessage
                                message={item}
                                prevUserMessage={prevUserMessage}
                                disabled={disabled}
                                onRegenerateResponse={onRegenerateResponse}
                            />
                        ) : (
                            <UserMessage
                                message={item}
                                disabled={disabled}
                                onUpdateMessage={onUpdateMessage}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

function AssistantMessage({ message, prevUserMessage, disabled, onRegenerateResponse }) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [previewModal, setPreviewModal] = useState({
isOpen: false,
driveId: null,
documentTitle: null,
});

    const contentRef = useRef();

    const handlePlayStop = useCallback(() => {
        if (isSpeaking) {
window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }
        const text = contentRef.current.innerText.trim();

        if (!text.trim()) return console.log("no hay texto");

        if (window.speechSynthesis.getVoices().length === 0) {
            return toast.error("No se han cargado las voces del navegador");
        }

        const fragments = text.match(/[^.!?]+[.!?]+(\s|$)|.+?(\s|$)/g) || [text];

        fragments.forEach((fragment, index) => {
            const cleanText = fragment.trim();
            if (cleanText.length === 0) return;

            const utter = new window.SpeechSynthesisUtterance(cleanText);

        utter.lang = "es-ES";
        utter.onstart = () => setIsSpeaking(true);
            utter.onend = () => setIsSpeaking(false);
        utter.onerror = () => setIsSpeaking(false);

            window.speechSynthesis.speak(utter);
        });
    }, [isSpeaking]);

    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        setIsSpeaking(false);
    };
}, []);

    const components = {
        a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
        ),
    };

    return (
        <div className="w-full flex flex-col gap-5 relative">
            <div className="flex items-center gap-2 text-primary">
                <Sparkles size={20} />
                <p className="text-sm scale-y-105 font-semibold">Thanos AI</p>
            </div>
            <div className="flex flex-col gap-2 w-full">
                <div className="w-fit overflow-x-clip text-ellipsis flex items-center gap-2 flex-wrap">
                    <div className="markdown prose" ref={contentRef}>
                        <Markdown remarkPlugins={[remarkGfm]} components={components}>
{message.content.text}
</Markdown>
                    </div>
                    {!message.streaming && (message.content.sources ?? []).length > 0 && (
                        <div className="collapse collapse-arrow bg-base-200 border-base-300 border">
                            <input type="checkbox" defaultChecked />
                            <div className="collapse-title font-semibold">Documentos del listado maestro:</div>
                            <div className="collapse-content text-sm">
                                <div className="w-full grid grid-cols-2 gap-2">
                                    {(message.content.sources ?? []).map((source, index) => (
                                        <div
                                            key={source.chunkId + "-" + index}
                                            className="border border-base-content/20 hover:border-primary/20 hover:bg-primary/10 transition-colors duration-300 rounded-md p-2 space-y-2 cursor-pointer tooltip tooltip-bottom group"
                                            data-tip={
                                                source.document?.driveId
                                                    ? "Ver documento"
                                                    : "Documento no disponible"
                                            }
                                            onClick={() => {
                                                if (source.document?.driveId) {
                                                    setPreviewModal({
                                                        isOpen: true,
                                                        driveId: source.document.driveId,
                                                        documentTitle: source.document?.title || "Documento",
                                                    });
                                                }
                                            }}
                                        >
                                            <p className="text-sm font-semibold scale-y-105 group-hover:underline underline-offset-3 line-clamp-1">
                                                {source.document?.title ??
                                                    "Documento no disponible"}
                                            </p>
                                            <p className="text-xs line-clamp-2 opacity-80">
                                                {source.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
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
                    className="btn btn-ghost w-8 h-8 rounded p-0 tooltip tooltip-bottom disabled:opacity-50 disabled:pointer-events-none"
                    data-tip="Recargar respuesta"
                    disabled={disabled}
                    onClick={() => {
                        if (onRegenerateResponse)
                            onRegenerateResponse(
                                prevUserMessage.messageId,
                                prevUserMessage.content.text,
                            );
                    }}
                >
                    <RefreshCcwIcon size={15} />
                </button>
            </div>
            <PreviewDocumentModal
                isOpen={previewModal.isOpen}
                onClose={() => setPreviewModal({ isOpen: false, driveId: null, documentTitle: null })}
                driveId={previewModal.driveId}
                documentTitle={previewModal.documentTitle}
            />
        </div>
    );
}

function UserMessage({ message, disabled, onUpdateMessage }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(message.content.text);
    const textareaRef = useRef(null);

    const adjustHeight = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
    };

    useEffect(() => {
        if (isEditing) {
            adjustHeight();
            textareaRef.current.focus();
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
                textareaRef.current.value.length;
        }
    }, [isEditing]);

    const handleSave = () => {
        const id = message.messageId;
        const newContent = editedContent.trim();
        if (id && newContent && onUpdateMessage) {
            onUpdateMessage(id, newContent);
            setIsEditing(false);
        } else {
            setIsEditing(false);
            setEditedContent(message.content.text);
        }
    };

    const getFileType = (mimeType) => {
        if (mimeType.includes("pdf")) return "PDF";
        if (mimeType.includes("docx")) return "DOCX";
        if (mimeType.includes("doc")) return "DOC";
        if (mimeType.includes("xlsx")) return "XLSX";
        return mimeType;
    };

    return (
        <div className="flex flex-col items-end gap-2 w-full">
            {message.content.mediaContent && (
                <article
                    className="w-30 bg-base-300 border border-base-content/20 rounded-lg p-2 text-sm group relative flex flex-col cursor-pointer"
                    onClick={() => {
                        window.open(message.content.mediaContent.url, "_blank");
                    }}
                >
                    <div className="flex-1">
                        <p className="text-sm font-medium leading-tight line-clamp-3 pb-5">
                            {message.content.mediaContent.filename}
                        </p>
                    </div>
                    <div className="badge badge-sm text-sm rounded badge-outline">
                        {getFileType(message.content.mediaContent.mimeType)}
                    </div>
                </article>
            )}
            <div className="w-full flex gap-2 justify-end group">
                <div className="group-hover:opacity-100 opacity-0 transition-opacity duration-300">
                    {!isEditing && (
                        <>
                            <button
                                className="btn btn-ghost w-8 h-8 rounded p-0"
                                onClick={() => {
                                    navigator.clipboard.writeText(message.content.text);
                                    toast.success("Respuesta copiada al portapapeles");
                                }}
                            >
                                <CopyIcon size={15} />
                            </button>
                            <button
                                className="btn btn-ghost w-8 h-8 rounded p-0 disabled:opacity-50 disabled:pointer-events-none"
                                disabled={disabled}
                                onClick={() => {
                                    if (!disabled) {
                                        setIsEditing(true);
                                        setEditedContent(message.content.text);
                                    }
                                }}
                            >
                                <PenIcon size={15} />
                            </button>
                        </>
                    )}
                </div>
                <div
                    className="w-fit max-w-xl rounded-2xl rounded-tr bg-primary text-primary-content p-4 overflow-x-clip text-ellipsis space-y-4"
                    style={{
                        width: isEditing ? "100%" : "fit-content",
                    }}
                >
                    {isEditing ? (
                        <>
                            <textarea
                                ref={textareaRef}
                                className="w-full min-w-0 max-w-full outline-none resize-none border border-base-content/30 rounded-md bg-base-content/10 p-1"
                                rows={1}
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                            />
                            <div className="flex items-center w-full justify-end gap-2">
                                <button
                                    className="btn btn-ghost btn-sm rounded"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditedContent(message.content.text);
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-ghost btn-sm rounded disabled:opacity-50 disabled:pointer-events-none"
                                    disabled={disabled}
                                    onClick={handleSave}
                                >
                                    Guardar
                                </button>
                            </div>
                        </>
                    ) : (
                        <>{message.content.text}</>
                    )}
                </div>
            </div>
        </div>
    );
}
