"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import ChatInput from "@/components/ChatInput";
import ChatMessageList from "@/components/ChatMessageList";

export default function ChatByIdPage() {
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

        setMessagesLoading(true);
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
    }, [loadMessages]);

    const handleFileChange = useCallback((event) => {
        const selected = event.target.files?.[0] ?? null;
        setFile(selected);
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!chatId) return;

        const trimmedContent = content.trim();
        if (!trimmedContent && !file) return;

        setIsSending(true);
        try {
            const response = await useApi("POST", "/messages", {
                chatId,
                content: trimmedContent,
                mediaContent: null,
            });

            if (response?.success) {
                setContent("");
                setFile(null);
                event.currentTarget.reset();
                await loadMessages();
            }
        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="w-full max-w-3xl h-full flex flex-col">
            <div className="w-full flex-1 overflow-y-auto pr-2">
                <ChatMessageList messages={messages} loading={messagesLoading} />
            </div>

            <ChatInput
                value={content}
                onChange={(event) => setContent(event.target.value)}
                onSubmit={handleSubmit}
                disabled={isSending}
                file={file}
                onChangeFile={handleFileChange}
            />
        </div>
    );
}
