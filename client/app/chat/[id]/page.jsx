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

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!chatId) return;

        const trimmedContent = content.trim();
        if (!trimmedContent && !file) return;

        const message = {
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

        addMessage(message);

        setIsSending(true);
        try {
            const response = await useApi("POST", "/messages", {
                chatId,
                content: trimmedContent,
                mediaContent: null,
            });

            if (!response?.success) return;
            setContent("");
            setFile(null);

            loadMessages();
        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            setIsSending(false);
        }
    };

    const addMessage = useCallback((message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
    }, []);

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-5" ref={containerRef}>
                <ChatMessageList messages={messages} loading={messagesLoading} />
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
