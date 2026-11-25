"use client";
import { FileTextIcon, FolderIcon, MicIcon, PhoneIcon, SendIcon, Square, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useRouter } from "next/navigation";
import Button from "./atoms/Button";
import { encodeMentions, mentionQueryAt, splitDisplayMentions } from "@/lib/mentions";
import { searchMentions } from "@/lib/documents";

const MENTION_DEBOUNCE_MS = 200;
// Styles the highlight layer copies from the textarea so its text lines up exactly
const MIRRORED_STYLES = [
    "boxSizing", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textIndent",
];
const MENTION_HIGHLIGHT = "color-mix(in oklab, var(--color-primary) 30%, transparent)";

export default function ChatInput({
    value,
    onChange,
    onSubmit,
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
    const highlightRef = useRef(null);

    // Auto-resize function
    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = "auto";

        // Set new height based on scrollHeight
        const newHeight = Math.min(textarea.scrollHeight, 200); // Max 200px
        textarea.style.height = `${newHeight}px`;
        syncHighlight();
    };

    // The highlight layer sits under the textarea: same box, font and scroll
    const syncHighlight = () => {
        const textarea = textareaRef.current;
        const layer = highlightRef.current;
        if (!textarea || !layer) return;
        const computed = window.getComputedStyle(textarea);
        for (const name of MIRRORED_STYLES) layer.style[name] = computed[name];
        layer.style.height = textarea.style.height;
        layer.scrollTop = textarea.scrollTop;
    };

    // Adjust height when value changes
    useEffect(() => {
        adjustHeight();
    }, [value]);

    // Adjust height on mount
    useEffect(() => {
        adjustHeight();
    }, []);

    // "@" menu: folders and documents matching what is typed after the "@"
    const [mention, setMention] = useState(null); // { query, start, end }
    const [results, setResults] = useState({ query: null, items: [] });
    const [activeIndex, setActiveIndex] = useState(0);
    // Mentions chosen from the menu; in the text they read "@Título" and are sent encoded
    const [selected, setSelected] = useState([]);
    const chosen = selected.filter((m) => value.includes(`@${m.label}`));
    const mentionQuery = mention?.query ?? null;
    const mentionLoading = mentionQuery !== null && results.query !== mentionQuery;
    const mentionItems = mentionLoading ? [] : results.items;

    const updateMention = (text, cursor) => {
        const found = mentionQueryAt(text, cursor);
        setMention(found ? { ...found, end: cursor } : null);
    };

    useEffect(() => {
        if (mentionQuery === null) return;
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const response = await searchMentions(mentionQuery);
                if (cancelled) return;
                const { folders = [], documents = [] } = response?.success ? response.data : {};
                setResults({
                    query: mentionQuery,
                    items: [
                        ...folders.map((f) => ({
                            kind: "folder",
                            id: f.id,
                            label: f.name,
                            detail: `${f.location} · ${f.documents} doc.`,
                        })),
                        ...documents.map((d) => ({
                            kind: "doc",
                            id: d.driveId,
                            label: d.title.replace(/\.[^/.]+$/, ""),
                            detail: d.location,
                        })),
                    ],
                });
                setActiveIndex(0);
            } catch (err) {
                console.error("Error buscando menciones:", err);
                if (!cancelled) setResults({ query: mentionQuery, items: [] });
            }
        }, MENTION_DEBOUNCE_MS);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [mentionQuery]);

    const menuOpen = mention !== null;

    const selectMention = (item) => {
        if (!mention) return;
        // "]" and line breaks cannot go in the sent mark: keep both texts equal
        const label = item.label.replace(/[\]\n]/g, " ").slice(0, 200);
        const inserted = `@${label} `;
        const next = value.slice(0, mention.start) + inserted + value.slice(mention.end);
        const cursor = mention.start + inserted.length;
        onChange({ target: { value: next } });
        setSelected((prev) => [...prev.filter((m) => m.label !== label), { kind: item.kind, id: item.id, label }]);
        setMention(null);
        requestAnimationFrame(() => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            textarea.focus();
            textarea.setSelectionRange(cursor, cursor);
        });
    };

    const submit = (e) => {
        e?.preventDefault?.();
        onSubmit(e, encodeMentions(value, chosen));
    };

    const handleChange = (e) => {
        onChange(e);
        setSelected((prev) => prev.filter((m) => e.target.value.includes(`@${m.label}`)));
        updateMention(e.target.value, e.target.selectionStart);
        adjustHeight();
    };

    const handleKeyDown = (e) => {
        if (menuOpen) {
            if (e.key === "Escape") {
                e.preventDefault();
                setMention(null);
                return;
            }
            if (mentionItems.length > 0) {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    const step = e.key === "ArrowDown" ? 1 : -1;
                    setActiveIndex((i) => (i + step + mentionItems.length) % mentionItems.length);
                    return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    selectMention(mentionItems[Math.min(activeIndex, mentionItems.length - 1)]);
                    return;
                }
            }
        }

        // Submit on Enter (without Shift)
        if (e.key === "Enter" && !e.shiftKey) {
            submit(e);
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
            onSubmit={submit}
            encType="multipart/form-data"
            className="relative mt-6 rounded-xl bg-base-200 border border-base-300 p-2 shadow-sm max-w-3xl mx-auto flex flex-col gap-2"
        >
            {menuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-base-200 border border-base-300 shadow-lg overflow-hidden z-20">
                    <p className="px-3 pt-2 pb-1 text-xs opacity-60">
                        Menciona una carpeta o documento (↑↓ para moverte, Enter para elegir, Esc para cerrar)
                    </p>
                    {mentionItems.length === 0 ? (
                        <p className="px-3 pb-3 text-sm opacity-70">
                            {mentionLoading ? "Buscando…" : "Sin resultados"}
                        </p>
                    ) : (
                        <ul role="listbox" className="max-h-72 overflow-y-auto pb-1">
                            {mentionItems.map((item, index) => {
                                const Icon = item.kind === "folder" ? FolderIcon : FileTextIcon;
                                return (
                                    <li
                                        key={`${item.kind}:${item.id}`}
                                        role="option"
                                        aria-selected={index === activeIndex}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        // mousedown keeps the textarea focused
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            selectMention(item);
                                        }}
                                        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer ${
                                            index === activeIndex ? "bg-primary/15" : ""
                                        }`}
                                    >
                                        <Icon
                                            size={16}
                                            className={`shrink-0 ${item.kind === "folder" ? "text-warning" : "text-primary"}`}
                                        />
                                        <div className="min-w-0">
                                            <p className="text-sm truncate">{item.label}</p>
                                            {item.detail && <p className="text-xs opacity-60 truncate">{item.detail}</p>}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
            {file && (
                <article className="w-30 aspect-square bg-base-300 border border-base-content/20 rounded-lg p-2 text-sm group relative flex flex-col">
                    <Button
                        type="button"
                        className="bg-base-300 w-7 h-7 rounded-lg p-0 absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        tooltipPlacement="bottom"
                        tooltip="Eliminar archivo"
                        onClick={() => onChangeFile({ target: { files: [] } })}
                    >
                        <XIcon size={15} />
                    </Button>
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

            <div className="flex items-center gap-0.5">
                {/* <label
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
                </label> */}

                <div className="flex-1 min-w-0 relative">
                    {/* Mentions shown as badges: highlights under the (transparent) textarea text */}
                    <div
                        ref={highlightRef}
                        aria-hidden="true"
                        className="absolute inset-x-0 top-0 overflow-hidden pointer-events-none whitespace-pre-wrap break-words text-transparent border-transparent border-solid"
                    >
                        {splitDisplayMentions(value, chosen).map((part, index) =>
                            part.type === "mention" ? (
                                <span
                                    key={index}
                                    className="rounded"
                                    style={{
                                        background: MENTION_HIGHLIGHT,
                                        boxShadow: `0 0 0 2px ${MENTION_HIGHLIGHT}`,
                                    }}
                                >
                                    {part.text}
                                </span>
                            ) : (
                                <span key={index}>{part.text}</span>
                            ),
                        )}
                        {/* A trailing line break needs content to take its line */}
                        {value.endsWith("\n") && " "}
                    </div>
                    <textarea
                        ref={textareaRef}
                        tabIndex={1}
                        name="content"
                        placeholder="Escribe tu mensaje... (@ para mencionar carpetas o documentos)"
                        value={value}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => updateMention(e.target.value, e.target.selectionStart)}
                        onBlur={() => setMention(null)}
                        onScroll={syncHighlight}
                        className="input input-ghost relative w-full text-base focus:outline-none bg-transparent resize-none max-w-full overflow-hidden leading-6"
                        style={{
                            minHeight: "24px",
                            maxHeight: "200px",
                            height: "auto",
                        }}
                        rows={1}
                    />
                </div>

                <div className="flex gap-2 items-center">
                    <Button
                        tabIndex={3}
                        type="button"
                        onClick={handleMicClick}
                        className={`w-10 h-10 rounded-lg p-0 ${isRecording ? "btn-error" : "btn-primary focus:btn-primary/80"}`}
                        disabled={disabled || isTranscribing}
                        tooltip={isRecording ? "Detener grabación" : "Grabar voz"}
                        loading={isTranscribing}
                    >
                        {isRecording ? (
                            <Square size={20} fill="currentColor" />
                        ) : (
                            <MicIcon size={20} />
                        )}
                    </Button>

                    {withVoice && false && (
                        <Button
                            tabIndex={4}
                            type="button"
                            onClick={() => router.push(`/chat/${chatId}/call`)}
                            className="btn-primary w-10 h-10 p-0 rounded-lg"
                            disabled={disabled || isTranscribing}
                            leftIcon={<PhoneIcon size={20} />}
                        />
                    )}

                    <Button
                        tabIndex={4}
                        type="submit"
                        className="btn-primary w-10 h-10 p-0 rounded-lg"
                        disabled={disabled}
                        loading={disabled}
                        leftIcon={<SendIcon size={20} />}
                    />
                </div>
            </div>
        </form>
    );
}
