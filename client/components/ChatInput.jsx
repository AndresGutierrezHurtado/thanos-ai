"use client";
import { FileIcon, Loader2Icon, SendIcon } from "lucide-react";
import { useEffect, useRef } from "react";

export default function ChatInput({
    value,
    onChange,
    onSubmit,
    disabled = false,
    file = null,
    onChangeFile,
    inputRef = null,
}) {
    const internalRef = useRef(null);
    const textareaRef = inputRef || internalRef;

    // Auto-resize function
    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = "auto";
        
        // Set new height based on scrollHeight
        const newHeight = Math.min(textarea.scrollHeight, 200); // Max 200px
        textarea.style.height = `${newHeight}px`;
    };

    // Adjust height when value changes
    useEffect(() => {
        adjustHeight();
    }, [value]);

    // Adjust height on mount
    useEffect(() => {
        adjustHeight();
    }, []);

    const handleChange = (e) => {
        onChange(e);
        adjustHeight();
    };

    const handleKeyDown = (e) => {
        // Submit on Enter (without Shift)
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit(e);
        }
    };

    return (
        <form
            onSubmit={onSubmit}
            encType="multipart/form-data"
            className="mt-6 rounded-xl bg-base-200 border border-base-300 p-2 flex items-center gap-0.5 shadow-sm max-w-3xl mx-auto"
        >
            <label tabIndex={2} className="btn btn-ghost w-10 h-10 rounded-lg p-0 self-end mb-0.5">
                <FileIcon size={20} />
                <input
                    name="mediaContent"
                    type="file"
                    className="hidden"
                    onChange={onChangeFile}
                    disabled={disabled}
                />
            </label>
            
            <div className="flex-1 min-w-0">
                <textarea
                    ref={textareaRef}
                    tabIndex={1}
                    name="content"
                    placeholder="Escribe tu mensaje..."
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    className="input input-ghost w-full text-base focus:outline-none bg-transparent resize-none max-w-full overflow-hidden leading-6"
                    style={{ 
                        minHeight: "24px",
                        maxHeight: "200px",
                        height: "auto",
                    }}
                    rows={1}
                    disabled={disabled}
                />
                {file && (
                    <p className="mt-1 text-xs opacity-70 truncate">
                        📎 {file.name}
                    </p>
                )}
            </div>

            <button
                tabIndex={3}
                type="submit"
                className="btn btn-primary w-10 h-10 focus:outline-offset-3 focus:btn-primary/80 rounded-lg p-0 self-end mb-0.5"
                disabled={disabled}
            >
                {disabled ? (
                    <Loader2Icon size={20} className="animate-spin" />
                ) : (
                    <SendIcon size={20} />
                )}
            </button>
        </form>
    );
}