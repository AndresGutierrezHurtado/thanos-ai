"use client";

import React, { useEffect, useState } from "react";
import { DownloadIcon, SquareArrowOutUpRightIcon, XIcon } from "lucide-react";
import { toast } from "react-toastify";

export default function PreviewDocumentModal({ isOpen, onClose, driveId, documentTitle }) {
    const modalRef = React.useRef(null);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (modalRef.current) {
            if (isOpen) {
                modalRef.current.show();
            } else {
                modalRef.current.close();
            }
        }
    }, [isOpen]);

    const handleDownload = async () => {
        if (!driveId) return;
        setDownloading(true);
        try {
            const url = `${process.env.NEXT_PUBLIC_API_URL}/drive/files/${driveId}/download`;
            const res = await fetch(url, { credentials: "include" });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || "Error al descargar");
            }
            const blob = await res.blob();
            const disposition = res.headers.get("Content-Disposition");
            let filename = documentTitle || "documento";
            if (disposition) {
                const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i)
                    || disposition.match(/filename=["']?([^"';]+)["']?/i);
                if (match) filename = decodeURIComponent(match[1].trim());
            }
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            URL.revokeObjectURL(a.href);
            toast.success("Descarga iniciada");
        } catch (e) {
            toast.error(e.message || "No se pudo descargar el documento");
        } finally {
            setDownloading(false);
        }
    };

    if (!driveId) return null;

    const previewUrl = `https://drive.google.com/file/d/${driveId}/preview`;
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
                            className="btn btn-sm rounded-lg border-base-300 w-10 h-10 p-0 tooltip tooltip-left disabled:opacity-50"
                            data-tip="Descargar documento"
                            onClick={handleDownload}
                            disabled={downloading}
                        >
                            <DownloadIcon size={20} className={downloading ? "animate-pulse" : ""} />
                        </button>
                        <button
                            className="btn btn-sm rounded-lg border-base-300 w-10 h-10 p-0 tooltip tooltip-left"
                            data-tip="Ver documento en Google Drive"
                            onClick={() => window.open(viewUrl, "_blank")}
                        >
                            <SquareArrowOutUpRightIcon size={20} />
                        </button>
                        <button
                            className="btn btn-sm rounded-lg border-base-300 w-10 h-10 p-0 tooltip tooltip-left"
                            data-tip="Cerrar"
                            onClick={onClose}
                        >
                            <XIcon size={20} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
                    <iframe
                        src={previewUrl}
                        className="w-full h-full border-0"
                        title="Vista previa del documento"
                        allow="autoplay"
                    />
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}
