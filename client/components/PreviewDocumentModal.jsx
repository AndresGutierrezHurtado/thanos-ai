"use client";

import React, { useEffect, useState } from "react";
import { DownloadIcon, SquareArrowOutUpRightIcon, XIcon } from "lucide-react";
import { toast } from "react-toastify";
import { canPreviewAsPdf, downloadDocument, fetchDocumentChunks, fetchDocumentFile } from "@/lib/documents";

const TABS = [
    { id: "original", label: "Original" },
    { id: "indexed", label: "Indexado" },
];

const EMPTY_PDF = { driveId: null, url: null, error: null };
const EMPTY_CHUNKS = { driveId: null, data: null, error: null };

/** Drive documents show their original and indexed content; uploaded files only the indexed. */
export default function PreviewDocumentModal({ isOpen, onClose, driveId, documentTitle, source, mimeType }) {
    const modalRef = React.useRef(null);
    const isLocal = source === "local";
    const tabs = isLocal ? TABS.filter(({ id }) => id === "indexed") : TABS;
    const [tab, setTab] = useState(tabs[0].id);
    const [downloading, setDownloading] = useState(false);
    const [pdf, setPdf] = useState(EMPTY_PDF);
    const [chunks, setChunks] = useState(EMPTY_CHUNKS);

    // Each time a document is opened it starts on its first tab, with its chunks unloaded (so
    // reopening it after a refresh shows the new ones). Adjusted while rendering, not in an effect
    const session = isOpen ? driveId : null;
    const [openedFor, setOpenedFor] = useState(session);
    if (openedFor !== session) {
        setOpenedFor(session);
        setTab(tabs[0].id);
        setChunks(EMPTY_CHUNKS);
    }

    // PDFs and Google Docs/Sheets/Slides are fetched as PDF with the session token, so they
    // show without a Google sign-in. Other Drive files fall back to Google's own viewer
    // (needs access to the file in Drive)
    const previewAsPdf = !isLocal && canPreviewAsPdf(mimeType);
    const currentPdf = pdf.driveId === driveId ? pdf : EMPTY_PDF;
    const currentChunks = chunks.driveId === driveId ? chunks : EMPTY_CHUNKS;
    const chunksLoaded = chunks.driveId === driveId;

    useEffect(() => {
        if (modalRef.current) {
            if (isOpen) {
                modalRef.current.show();
            } else {
                modalRef.current.close();
            }
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !driveId || !previewAsPdf) return;

        let url = null;
        let cancelled = false;
        fetchDocumentFile(driveId)
            .then(({ blob }) => {
                if (cancelled) return;
                url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
                setPdf({ driveId, url, error: null });
            })
            .catch((e) => {
                if (!cancelled) {
                    setPdf({
                        driveId,
                        url: null,
                        error: e.message || "No se pudo cargar la vista previa",
                    });
                }
            });

        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
            setPdf(EMPTY_PDF);
        };
    }, [isOpen, driveId, previewAsPdf]);

    // Chunks load the first time the Indexed tab is shown for an opened document
    useEffect(() => {
        if (!isOpen || !driveId || tab !== "indexed" || chunksLoaded) return;

        const fallback = "No se pudo cargar el contenido indexado";
        let cancelled = false;
        fetchDocumentChunks(driveId)
            .then((response) => {
                if (cancelled) return;
                setChunks(
                    response?.success
                        ? { driveId, data: response.data, error: null }
                        : { driveId, data: null, error: response?.message || fallback },
                );
            })
            .catch(() => {
                if (!cancelled) setChunks({ driveId, data: null, error: fallback });
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, driveId, tab, chunksLoaded]);

    const handleDownload = async () => {
        if (!driveId) return;
        setDownloading(true);
        try {
            await downloadDocument(driveId, documentTitle || "documento");
            toast.success("Descarga iniciada");
        } catch (e) {
            toast.error(e.message || "No se pudo descargar el documento");
        } finally {
            setDownloading(false);
        }
    };

    if (!driveId) return null;

    const viewUrl = `https://drive.google.com/file/d/${driveId}/view`;

    return (
        <dialog ref={modalRef} className="modal" onClose={onClose}>
            <div className="modal-box max-w-6xl w-full h-[90vh] flex flex-col p-0 border border-base-300 rounded-lg">
                <div className="flex items-center justify-between p-4 border-b border-base-300">
                    <h3 className="font-bold text-lg line-clamp-1 flex-1 mr-4">
                        {documentTitle || "Vista previa del documento"}
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            className="btn btn-sm rounded-lg border-base-300 w-10 h-10 p-0 disabled:opacity-50"
                            data-tip-placement="left"
                            data-tip="Descargar documento"
                            onClick={handleDownload}
                            disabled={downloading}
                        >
                            <DownloadIcon size={20} className={downloading ? "animate-pulse" : ""} />
                        </button>
                        {!isLocal && (
                            <button
                                className="btn btn-sm rounded-lg border-base-300 w-10 h-10 p-0"
                                data-tip-placement="left"
                                data-tip="Ver documento en Google Drive"
                                onClick={() => window.open(viewUrl, "_blank")}
                            >
                                <SquareArrowOutUpRightIcon size={20} />
                            </button>
                        )}
                        <button
                            className="btn btn-sm rounded-lg border-base-300 w-10 h-10 p-0"
                            data-tip-placement="left"
                            data-tip="Cerrar"
                            onClick={onClose}
                        >
                            <XIcon size={20} />
                        </button>
                    </div>
                </div>

                {tabs.length > 1 && (
                    <div role="tablist" className="tabs tabs-border px-4">
                        {tabs.map(({ id, label }) => (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                aria-selected={tab === id}
                                className={`tab ${tab === id ? "tab-active" : ""}`}
                                onClick={() => setTab(id)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex-1 overflow-hidden">
                    {tab === "indexed" ? (
                        <IndexedContent data={currentChunks.data} error={currentChunks.error} isLocal={isLocal} />
                    ) : (
                        <OriginalPreview
                            previewAsPdf={previewAsPdf}
                            pdfUrl={currentPdf.url}
                            pdfError={currentPdf.error}
                            googleUrl={`https://drive.google.com/file/d/${driveId}/preview`}
                        />
                    )}
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}

function Placeholder({ children }) {
    return (
        <div className="w-full h-full flex items-center justify-center text-sm opacity-70 p-4 text-center">
            {children}
        </div>
    );
}

function OriginalPreview({ previewAsPdf, pdfUrl, pdfError, googleUrl }) {
    const src = previewAsPdf ? pdfUrl : googleUrl;

    if (previewAsPdf && pdfError) return <Placeholder>{pdfError}</Placeholder>;
    if (previewAsPdf && !pdfUrl) return <Placeholder>Cargando vista previa…</Placeholder>;
    if (!src) {
        return (
            <Placeholder>
                Vista previa no disponible para este tipo de archivo. Puedes descargarlo o ver su contenido en la
                pestaña Indexado.
            </Placeholder>
        );
    }

    return <iframe src={src} className="w-full h-full border-0" title="Vista previa del documento" allow="autoplay" />;
}

function IndexedContent({ data, error, isLocal }) {
    if (error) return <Placeholder>{error}</Placeholder>;
    if (!data) return <Placeholder>Cargando contenido indexado…</Placeholder>;

    const { document, metadata, chunks, truncated } = data;
    const fields = [
        ["Ubicación", document.location],
        ["Formato", metadata.sourceType],
        ["Ruta", document.path],
        ["Versión", formatDate(document.version)],
        ["Procesado", formatDate(document.processedAt)],
    ];

    return (
        <div className="h-full overflow-y-auto p-4 space-y-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {fields.map(([label, value]) => (
                    <div key={label} className="flex gap-2 min-w-0">
                        <dt className="opacity-60 shrink-0">{label}:</dt>
                        <dd className="truncate" title={value ?? ""}>
                            {value || "—"}
                        </dd>
                    </div>
                ))}
            </dl>

            <p className="text-sm opacity-70">
                {chunks.length.toLocaleString("es-CO")} fragmento(s) que consulta el asistente
                {truncated ? " (se muestran los primeros)" : ""}.
            </p>

            {chunks.length === 0 ? (
                <p className="text-sm opacity-70">
                    No hay fragmentos indexados para este documento.
                    {isLocal ? "" : " Actualízalo para volver a procesarlo."}
                </p>
            ) : (
                <ol className="space-y-3">
                    {chunks.map((chunk, index) => (
                        <li key={chunk.id} className="border border-base-300 rounded-lg p-3 space-y-2">
                            <p className="text-xs opacity-60">
                                #{index + 1}
                                {chunk.section ? ` · ${chunk.section}` : ""}
                            </p>
                            <p className="text-sm whitespace-pre-wrap break-words">{chunk.content}</p>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

function formatDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("es-CO");
}
