"use client";
import { FileIcon, Loader2Icon, MicIcon, PhoneIcon, SendIcon, Square, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApi as apiRequest } from "@/hooks/useApi";
import { useRouter } from "next/navigation";

export default function ChatInput({
    value,
    onChange,
    onSubmit,
    provider = "gpt",
    onProviderChange,
    disabled = false,
    withVoice = false,
    chatId = null,
    file = null,
    onChangeFile,
    inputRef = null,
}) {
    const router = useRouter();
    const internalRef = useRef(null);
    const textareaRef = inputRef || internalRef;
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    // Auto-resize function
    const adjustHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = "auto";

        // Set new height based on scrollHeight
        const newHeight = Math.min(textarea.scrollHeight, 200); // Max 200px
        textarea.style.height = `${newHeight}px`;
    }, [textareaRef]);

    // Adjust height when value changes
    useEffect(() => {
        adjustHeight();
    }, [value, adjustHeight]);

    // Adjust height on mount
    useEffect(() => {
        adjustHeight();
    }, [adjustHeight]);

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

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            mediaRecorder.onstop = () => {
                stream.getTracks().forEach((track) => track.stop());
            };
            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error al acceder al micrófono:", err);
        }
    }, []);

    const stopRecording = useCallback(async () => {
        const mediaRecorder = mediaRecorderRef.current;
        if (!mediaRecorder || mediaRecorder.state === "inactive") {
            setIsRecording(false);
            return;
        }
        const previousOnStop = mediaRecorder.onstop;
        mediaRecorder.onstop = async () => {
            if (previousOnStop) previousOnStop();
            const blob = new Blob(chunksRef.current, { type: "audio/webm" });
            if (blob.size === 0) return;
            setIsTranscribing(true);
            try {
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result?.split(",")?.[1] ?? "");
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                const response = await apiRequest("POST", "/speech-to-text", { audio: base64 });
                if (response?.success && response?.data) {
                    onChange({
                        target: { value: value ? `${value} ${response.data}` : response.data },
                    });
                }
            } catch (err) {
                console.error("Error en speech-to-text:", err);
            } finally {
                setIsTranscribing(false);
            }
        };
        mediaRecorder.stop();
        setIsRecording(false);
    }, [onChange, value]);

    const handleMicClick = useCallback(() => {
        if (isRecording) stopRecording();
        else startRecording();
    }, [isRecording, startRecording, stopRecording]);

    const getFileType = (mimeType) => {
        if (mimeType.includes("pdf")) return "PDF";
        if (mimeType.includes("docx")) return "DOCX";
        if (mimeType.includes("doc")) return "DOC";
        if (mimeType.includes("xlsx")) return "XLSX";
        return mimeType;
    };
    return (
        <form
            onSubmit={onSubmit}
            encType="multipart/form-data"
            className="mt-6 rounded-xl bg-base-200 border border-base-300 p-2 shadow-sm max-w-3xl mx-auto flex flex-col gap-2"
        >

            {file && (
                <article className="w-30 aspect-square bg-base-300 border border-base-content/20 rounded-lg p-2 text-sm group relative flex flex-col">
                    <button
                        type="button"
                        className="btn bg-base-300 w-7 h-7 border border-base-content/20 rounded-lg p-0 absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 tooltip tooltip-bottom"
                        data-tip="Eliminar archivo"
                        onClick={() => onChangeFile({ target: { files: [] } })}
                    >
                        <XIcon size={15} />
                    </button>
                    <div className="flex-1">
                        <p className="text-sm font-medium leading-tight line-clamp-3">
                            {file.name}
                        </p>
                    </div>
                    <div className="badge badge-sm text-sm rounded badge-outline">
                        {getFileType(file.type)}
                    </div>
                </article>
            )}

            <div className="w-full py-2">
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
                    />
            </div>

            <div className="flex items-center justify-between gap-2 px-1">
                <label
                    tabIndex={2}
                    className="btn btn-ghost w-10 h-10 rounded-lg p-0 self-end mb-0.5"
                >
                    <FileIcon size={20} />
                    <input
                        name="mediaContent"
                        type="file"
                        className="hidden"
                        multiple={false}
                        accept="application/pdf,document/docx,document/doc,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/html"
                        onChange={onChangeFile}
                        disabled={disabled}
                    />
                </label>
                <div className="flex items-center gap-2">
                    <select
                        value={provider}
                        onChange={(event) => onProviderChange?.(event.target.value)}
                        className="select select-bordered select-sm w-32 rounded-lg h-10"
                        disabled={disabled}
                    >
                        <option value="gpt">GPT</option>
                        <option value="ollama">Ollama</option>
                    </select>
                    <button
                        tabIndex={3}
                        type="button"
                        onClick={handleMicClick}
                        className={`btn w-10 h-10 focus:outline-offset-3 rounded-lg p-0 self-end mb-0.5 ${isRecording ? "btn-error" : "btn-primary focus:btn-primary/80"}`}
                        disabled={disabled || isTranscribing}
                        title={isRecording ? "Detener grabación" : "Grabar voz"}
                    >
                        {isTranscribing ? (
                            <Loader2Icon size={20} className="animate-spin" />
                        ) : isRecording ? (
                            <Square size={20} fill="currentColor" />
                        ) : (
                            <MicIcon size={20} />
                        )}
                    </button>

                    {withVoice && (
                        <button
                            tabIndex={4}
                            type="button"
                            onClick={() => router.push(`/chat/${chatId}/call`)}
                            className="btn btn-primary w-10 h-10 focus:outline-offset-3 focus:btn-primary/80 rounded-lg p-0 self-end mb-0.5"
                            disabled={disabled || isTranscribing}
                        >
                            <PhoneIcon size={20} />
                        </button>
                    )}

                    <button
                        tabIndex={4}
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
                </div>
            </div>
        </form>
    );
}
