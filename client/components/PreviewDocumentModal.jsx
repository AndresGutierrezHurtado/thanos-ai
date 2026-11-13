"use client";

import React, { useEffect, useState } from "react";
import { DownloadIcon, SquareArrowOutUpRightIcon, XIcon } from "lucide-react";
import { toast } from "react-toastify";
import { downloadDocument, fetchDocumentFile } from "@/lib/documents";

export default function PreviewDocumentModal({ isOpen, onClose, driveId, documentTitle, source, mimeType }) {
    const modalRef = React.useRef(null);
    const [downloading, setDownloading] = useState(false);
    const [localPreviewUrl, setLocalPreviewUrl] = useState(null);

    // Drive files are previewed by Google. Uploaded files have no public URL: PDFs are
    // fetched with the session token and shown from memory; other types are download-only
    const isLocal = source === "local";
    const canPreviewLocal = isLocal && mimeType === "application/pdf";

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
        if (!isOpen || !driveId || !canPreviewLocal) return;

        let url = null;
        let cancelled = false;
        fetchDocumentFile(driveId)
            .then(({ blob }) => {
                if (cancelled) return;
                url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
                setLocalPreviewUrl(url);
            })
            .catch((e) => toast.error(e.message || "No se pudo cargar la vista previa"));

        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
            setLocalPreviewUrl(null);
        };
    }, [isOpen, driveId, canPreviewLocal]);

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

    const previewUrl = isLocal ? localPreviewUrl : `https://drive.google.com/file/d/${driveId}/preview`;
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
                <div className="flex-1 overflow-hidden">
                    {previewUrl ? (
                        <iframe
                            src={previewUrl}
                            className="w-full h-full border-0"
                            title="Vista previa del documento"
                            allow="autoplay"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm opacity-70 p-4 text-center">
                            {canPreviewLocal
                                ? "Cargando vista previa…"
                                : "Vista previa no disponible para este tipo de archivo. Puedes descargarlo."}
                        </div>
                    )}
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}
