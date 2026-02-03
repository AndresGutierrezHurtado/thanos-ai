"use client";

import { FileIcon, Loader2Icon, SendIcon } from "lucide-react";

export default function ChatInput({
    value,
    onChange,
    onSubmit,
    disabled = false,
    file = null,
    onChangeFile,
}) {
    return (
        <form
            onSubmit={onSubmit}
            encType="multipart/form-data"
            className="mt-6 rounded-xl bg-base-200 border border-base-300 p-2 flex items-center gap-3 shadow-sm"
        >
            <label tabIndex={2} className="btn btn-ghost w-10 h-10 rounded-lg p-0">
                <FileIcon size={20} />
                <input
                    name="mediaContent"
                    type="file"
                    className="hidden"
                    onChange={onChangeFile}
                    disabled={disabled}
                />
            </label>

            <div className="flex-1">
                <input
                    tabIndex={1}
                    name="content"
                    type="text"
                    placeholder="Escribe tu mensaje..."
                    value={value}
                    onChange={onChange}
                    className="input input-ghost w-full text-base focus:outline-none bg-transparent"
                    disabled={disabled}
                />
                {file && <p className="mt-1 text-xs opacity-70 truncate">{file.name}</p>}
            </div>

            <button
                tabIndex={3}
                type="submit"
                className="btn btn-primary w-10 h-10 focus:outline-offset-3 focus:btn-primary/80 rounded-lg p-0"
                disabled={disabled}
            >
                {disabled ? <Loader2Icon size={20} /> : <SendIcon size={20} />}
            </button>
        </form>
    );
}
