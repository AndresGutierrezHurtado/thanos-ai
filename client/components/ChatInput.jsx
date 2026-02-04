"use client";
import { FileIcon, Loader2Icon, MicIcon, SendIcon, Square, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/hooks/useApi";

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
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

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
                const response = await useApi("POST", "/speech-to-text", { audio: base64 });
                if (response?.success && response?.data) {
                    onChange({ target: { value: value ? `${value} ${response.data}` : response.data } });
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
                    >
                        <XIcon size={15} />
                    </button>
                    <div className="flex-1">
                        <p className="text-sm font-medium leading-tight">{file.name}</p>
                    </div>
                    <div className="badge badge-sm text-sm rounded badge-outline">PDF</div>
                </article>
            )}

            <div className="flex items-center gap-0.5">
                <label
                    tabIndex={2}
                    className="btn btn-ghost w-10 h-10 rounded-lg p-0 self-end mb-0.5"
                >
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
                </div>

                <button
                    tabIndex={3}
                    type="button"
                    onClick={handleMicClick}
                    className={`btn w-10 h-10 focus:outline-offset-3 rounded-lg p-0 self-end mb-0.5 mr-2 ${isRecording ? "btn-error" : "btn-primary focus:btn-primary/80"}`}
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
        </form>
    );
}
