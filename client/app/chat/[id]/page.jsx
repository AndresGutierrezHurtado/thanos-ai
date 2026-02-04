"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import ChatInput from "@/components/ChatInput";
import ChatMessageList from "@/components/ChatMessageList";

export default function ChatByIdPage() {
    const containerRef = useRef(null);

    const params = useParams();
    const chatId = useMemo(() => {
        const value = params?.id;
        return Array.isArray(value) ? value[0] : value ?? null;
    }, [params]);

    const [messages, setMessages] = useState([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [content, setContent] = useState("");
    const [file, setFile] = useState(null);
    const [isSending, setIsSending] = useState(false);

    const loadMessages = useCallback(async () => {
        if (!chatId) return;
        try {
            const response = await useApi("GET", `/chats/${chatId}/messages`);
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
    }, [chatId]);

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

    const handleFileChange = useCallback((event) => {
        const selected = event.target.files?.[0] ?? null;
        setFile(selected);
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

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!chatId) return;

        const trimmedContent = content.trim();
        if (!trimmedContent && !file) return;

        const userMessage = {
            id: null,
            chatId,
            role: "user",
            timestamp: new Date(),
            content: {
                text: trimmedContent,
                sources: null,
                mediaContent: null,
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
            content: { text: "", sources: null, mediaContent: null },
            streaming: true,
        });

        try {
            const response = await useApi("POST", "/messages", {
                chatId,
                content: trimmedContent,
                mediaContent: null,
            });

            if (!response?.success) {
                setMessages((prev) => prev.slice(0, -1));
                return;
            }

            const fullText = response?.data?.content?.text ?? "";
            const words = fullText.split(/(\s+)/); // mantiene espacios
            const delayMs = 25;

            for (let i = 0; i < words.length; i++) {
                await new Promise((r) => setTimeout(r, delayMs));
                appendToLastAssistantMessage(words[i]);
            }

            // Sustituir por el mensaje final (con messageId, sources, etc.)
            setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant" && response?.data) {
                    next[next.length - 1] = {
                        ...last,
                        messageId: response.data.messageId,
                        timestamp: response.data.timestamp ?? last.timestamp,
                        streaming: false,
                        content: {
                            text: response.data.content?.text ?? last.content?.text,
                            sources: response.data.content?.sources ?? null,
                            mediaContent: null,
                        },
                    };
                }
                return next;
            });
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

    const addMessage = useCallback((message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
    }, []);

    const handleUpdateMessage = useCallback(async (messageId, content) => {
        if (!messageId) return;
        setIsSending(true);
        try {
            const response = await useApi("PUT", `/messages/${messageId}`, {
                content,
            });
            if (response?.success && response?.data?.messages) {
                setMessages(response.data.messages);
            }
        } catch (error) {
            console.error("Failed to update message", error);
        } finally {
            setIsSending(false);
            loadMessages();
        }
    }, []);

    const handleRegenerateResponse = useCallback(async (userMessageId, userContent) => {
        if (!userMessageId) return;
        setIsSending(true);
        try {
            const response = await useApi("PUT", `/messages/${userMessageId}`, {
                content: userContent,
            });
            if (response?.success && response?.data?.messages) {
                setMessages(response.data.messages);
            }
        } catch (error) {
            console.error("Failed to regenerate response", error);
        } finally {
            setIsSending(false);
            loadMessages();
        }
    }, []);

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-5" ref={containerRef}>
                <ChatMessageList
                    messages={messages}
                    loading={messagesLoading}
                    disabled={isSending}
                    onUpdateMessage={handleUpdateMessage}
                    onRegenerateResponse={handleRegenerateResponse}
                />
            </div>
            <div className="w-full p-5 pt-0">
                <ChatInput
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    onSubmit={handleSubmit}
                    disabled={isSending}
                    file={file}
                    onChangeFile={handleFileChange}
                />
            </div>
        </div>
    );
}
