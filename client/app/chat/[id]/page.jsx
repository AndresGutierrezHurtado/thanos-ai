"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useApi as apiRequest } from "@/hooks/useApi";
import { streamRequest } from "@/lib/streamRequest";
import ChatInput, { DEFAULT_PROVIDER_STORAGE_KEY } from "@/components/ChatInput";
import ChatMessageList from "@/components/ChatMessageList";
import toBase64 from "@/lib/toBase64";

export default function ChatByIdPage() {
    // Refs
    const containerRef = useRef(null);
    const textareaRef = useRef(null);

    // Params
    const params = useParams();
    const chatId = useMemo(() => {
        const value = params?.id;
        return Array.isArray(value) ? value[0] : value ?? null;
    }, [params]);

    // States
    const [messages, setMessages] = useState([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [content, setContent] = useState("");
    const [file, setFile] = useState(null);
    const [provider, setProvider] = useState("gpt");
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(DEFAULT_PROVIDER_STORAGE_KEY);
            if (stored === "gpt" || stored === "ollama") setProvider(stored);
        } catch (_) {}
    }, []);

    // Effects
    const loadMessages = useCallback(async () => {
        if (!chatId) return;
        try {
            const response = await apiRequest("GET", `/chats/${chatId}/messages`);
            if (!response?.success) {
                setMessages([]);
                return;
            }
            setMessages(response.data ?? []);
        } catch (error) {
            console.error("Failed to load messages", error);
            setMessages([]);
        } finally {
            setMessagesLoading(false);
        }
    }, [chatId]);

    useEffect(() => {
        loadMessages();
    }, [loadMessages]);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTo({
                top: containerRef.current.scrollHeight,
                behavior: "instant",
            });
        }
    }, [messages]);

    useEffect(() => {
        setTimeout(() => {
            if (containerRef.current) {
                const { scrollHeight, clientHeight, scrollTop } = containerRef.current;
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 500;

                if (isNearBottom) {
                    containerRef.current.scrollTo({
                        top: scrollHeight,
                        behavior: "smooth",
                    });
                }
            }
        }, 100);
    }, [messages]);

    // callbacks
    const handleFileChange = useCallback((e) => {
        const selected = e?.target?.files?.[0] ?? null;
        setFile(selected);
    }, []);

    const addMessage = useCallback((message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
    }, []);

    const appendToLastAssistantMessage = useCallback((textToAppend) => {
        setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
                next[next.length - 1] = {
                    ...last,
                    content: {
                        ...last.content,
                        text: (last.content?.text ?? "") + textToAppend,
                    },
                };
            }
            return next;
        });
    }, []);

    const prepareForStreamingAfterUserMessage = useCallback(
        (messageId, newContent = null) => {
            setMessages((prev) => {
                const idx = prev.findIndex((m) => m.messageId === messageId);
                if (idx < 0) return prev;

                const next = [...prev.slice(0, idx + 1)];

                if (newContent != null) {
                    next[idx] = {
                        ...next[idx],
                        content: {
                            ...next[idx].content,
                            text: newContent,
                        },
                    };
                }

                return [
                    ...next,
                    {
                        id: null,
                        chatId,
                        role: "assistant",
                        timestamp: new Date(),
                        content: {
                            text: "",
                            sources: [],
                            mediaContent: null,
                        },
                        streaming: true,
                    },
                ];
            });
        },
        [chatId]
    );

    // Handlers
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!chatId) return;

        const trimmedContent = content.trim();
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

        if (!trimmedContent) return;

        const userMessage = {
            id: null,
            chatId,
            role: "user",
            timestamp: new Date(),
            content: {
                text: trimmedContent,
                sources: null,
                mediaContent,
            },
        };

        addMessage(userMessage);
        setContent("");
        setFile(null);
        setIsSending(true);

        // Mensaje asistente vacío; se irá llenando palabra a palabra
        addMessage({
            id: null,
            chatId,
            role: "assistant",
            timestamp: new Date(),
            content: { text: "", sources: [], mediaContent: null },
            streaming: true,
        });

        try {
            await streamRequest(
                "POST",
                "/messages",
                { chatId, content: trimmedContent, mediaContent, provider },
                {
                    onChunk: appendToLastAssistantMessage,
                    onFinal: () => {
                        loadMessages();
                        setTimeout(() => textareaRef.current?.focus(), 100);
                    },
                }
            );
        } catch (error) {
            console.error("Failed to send message", error);
            setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") {
                    next[next.length - 1] = {
                        ...last,
                        streaming: false,
                        content: {
                            ...last.content,
                            text:
                                (last.content?.text ?? "") + "\n\n*Error al obtener la respuesta.*",
                        },
                    };
                }
                return next;
            });
        } finally {
            setIsSending(false);
        }
    };

    const handleUpdateMessage = useCallback(
        async (messageId, content) => {
            if (!messageId || !chatId || !content) return;
            setIsSending(true);
            prepareForStreamingAfterUserMessage(messageId, content);
            try {
                await streamRequest(
                    "PUT",
                    `/messages/${messageId}`,
                    { content, provider },
                    {
                        onChunk: appendToLastAssistantMessage,
                        onFinal: () => {
                            loadMessages();
                            setTimeout(() => textareaRef.current?.focus(), 100);
                        },
                    }
                );
            } catch (error) {
                console.error("Failed to update message", error);
                setMessages((prev) => {
                    const next = [...prev];
                    const last = next[next.length - 1];
                    if (last?.role === "assistant") {
                        next[next.length - 1] = {
                            ...last,
                            streaming: false,
                            content: {
                                ...last.content,
                                text:
                                    (last.content?.text ?? "") +
                                    "\n\n*Error al obtener la respuesta.*",
                            },
                        };
                    }
                    return next;
                });
            } finally {
                setIsSending(false);
            }
        },
        [
            chatId,
            prepareForStreamingAfterUserMessage,
            appendToLastAssistantMessage,
            loadMessages,
            provider,
        ]
    );

    return (
        <div className="w-full h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 pt-5" ref={containerRef}>
                <ChatMessageList
                    messages={messages}
                    loading={messagesLoading}
                    disabled={isSending}
                    onUpdateMessage={handleUpdateMessage}
                    onRegenerateResponse={handleUpdateMessage}
                />
            </div>
            <div className="w-full p-5 pt-0">
                <ChatInput
                    withVoice={true}
                    chatId={chatId}
                    inputRef={textareaRef}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    onSubmit={handleSubmit}
                    provider={provider}
                    onProviderChange={setProvider}
                    disabled={isSending}
                    file={file}
                    onChangeFile={handleFileChange}
                />
            </div>
        </div>
    );
}
