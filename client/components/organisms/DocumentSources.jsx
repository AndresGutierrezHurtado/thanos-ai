"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { CloudIcon, FolderUpIcon, HardDriveIcon, RefreshCwIcon, UploadIcon } from "lucide-react";
import Button from "../atoms/Button.jsx";
import { useApi } from "@/hooks/useApi";
import { SOURCE_LABELS, SUPPORTED_EXTENSIONS, filterUploadable, uploadDocuments } from "@/lib/documents";

const POLL_INTERVAL_MS = 3000;

function formatDate(value) {
    return value ? new Date(value).toLocaleString("es-CO") : "nunca";
}

/** Google Drive and uploaded files: counts, sync with live progress, uploads. */
export default function DocumentSources({ reloadKey, onDocumentsChanged }) {
    const [sources, setSources] = useState(null);
    const [upload, setUpload] = useState(null); // { done, total } while uploading
    const [uploadIssues, setUploadIssues] = useState([]);
    const filesInputRef = useRef(null);
    const folderInputRef = useRef(null);

    const load = useCallback(async () => {
        const response = await useApi("GET", "/documents/sources");
        if (response?.success) setSources(response.data);
    }, []);

    useEffect(() => {
        load();
    }, [load, reloadKey]);

    // Poll while any source is syncing; refresh the document list when a sync ends
    const anyRunning = sources?.some((source) => source.sync?.running) ?? false;
    const wasRunning = useRef(false);

    useEffect(() => {
        if (wasRunning.current && !anyRunning) onDocumentsChanged();
        wasRunning.current = anyRunning;

        if (!anyRunning) return;
        const id = setInterval(load, POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, [anyRunning, load, onDocumentsChanged]);

    const handleSync = async (source) => {
        await useApi("POST", "/documents/sync", { source }, true);
        load();
    };

    const handleFiles = async (event) => {
        const picked = Array.from(event.target.files ?? []);
        event.target.value = "";
        if (picked.length === 0) return;

        const { accepted, skipped } = filterUploadable(picked);
        setUploadIssues(skipped);
        if (accepted.length === 0) {
            toast.error("Ninguno de los archivos seleccionados es de un tipo soportado");
            return;
        }

        setUpload({ done: 0, total: accepted.length });
        try {
            const result = await uploadDocuments(accepted, (done, total) => setUpload({ done, total }));
            setUploadIssues([...skipped, ...result.rejected]);
            toast.success(`${result.saved} archivo(s) subido(s). Se están indexando.`);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setUpload(null);
            onDocumentsChanged();
        }
    };

    if (!sources) {
        return <div className="text-sm opacity-70">Cargando fuentes…</div>;
    }

    return (
        <section className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sources.map((source) => (
                    <article
                        key={source.source}
                        className="border border-neutral-content/10 rounded-lg p-4 space-y-3 bg-base-200"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                                {source.source === "drive" ? <CloudIcon size={20} /> : <HardDriveIcon size={20} />}
                                <div>
                                    <p className="font-semibold">{SOURCE_LABELS[source.source]}</p>
                                    <p className="text-xs opacity-70">
                                        {source.configured
                                            ? `${source.documents.toLocaleString("es-CO")} documentos · actualizado ${formatDate(source.lastUpdatedAt)}`
                                            : "No configurado (faltan las credenciales GOOGLE_* en .env)"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {source.configured && (
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    className="btn-sm bg-base-content/10"
                                    disabled={source.sync?.running}
                                    onClick={() => handleSync(source.source)}
                                    leftIcon={<RefreshCwIcon size={15} />}
                                >
                                    Sincronizar
                                </Button>
                                {source.source === "local" && (
                                    <>
                                        <Button
                                            type="button"
                                            className="btn-sm btn-primary"
                                            disabled={!!upload}
                                            onClick={() => filesInputRef.current?.click()}
                                            leftIcon={<UploadIcon size={15} />}
                                        >
                                            Subir archivos
                                        </Button>
                                        <Button
                                            type="button"
                                            className="btn-sm btn-primary"
                                            disabled={!!upload}
                                            onClick={() => folderInputRef.current?.click()}
                                            leftIcon={<FolderUpIcon size={15} />}
                                        >
                                            Subir carpeta
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}

                        {source.source === "local" && upload && (
                            <Progress
                                label={`Subiendo ${upload.done} de ${upload.total} archivos`}
                                value={upload.done}
                                max={upload.total}
                            />
                        )}

                        {source.sync && <SyncStatus sync={source.sync} />}
                    </article>
                ))}
            </div>

            <input
                ref={filesInputRef}
                type="file"
                multiple
                accept={SUPPORTED_EXTENSIONS.join(",")}
                className="hidden"
                onChange={handleFiles}
            />
            <input
                ref={folderInputRef}
                type="file"
                multiple
                webkitdirectory=""
                className="hidden"
                onChange={handleFiles}
            />

            {uploadIssues.length > 0 && (
                <IssueList title={`${uploadIssues.length} archivo(s) no subido(s)`} issues={uploadIssues} />
            )}
        </section>
    );
}

function SyncStatus({ sync }) {
    const done = sync.processed + sync.unchanged + sync.failed;
    const counts = `${sync.processed} indexados · ${sync.unchanged} sin cambios · ${sync.failed} fallidos · ${sync.removed} eliminados`;

    return (
        <div className="space-y-2 text-sm">
            {sync.running ? (
                sync.total > 0 ? (
                    <Progress label={`Sincronizando ${done} de ${sync.total} · ${counts}`} value={done} max={sync.total} />
                ) : (
                    <Progress label="Listando archivos…" />
                )
            ) : (
                <p className="text-xs opacity-70">
                    Última sincronización ({formatDate(sync.finishedAt)}): {counts}
                </p>
            )}
            {sync.error && <p className="text-xs text-error">Error: {sync.error}</p>}
            {sync.errors.length > 0 && <IssueList title={`${sync.failed} archivo(s) con error`} issues={sync.errors} />}
        </div>
    );
}

function Progress({ label, value, max }) {
    return (
        <div className="space-y-1">
            <p className="text-xs opacity-80">{label}</p>
            <progress className="progress progress-primary w-full" value={value} max={max} />
        </div>
    );
}

function IssueList({ title, issues }) {
    return (
        <details className="collapse collapse-arrow bg-base-100 border border-base-300 text-xs">
            <summary className="collapse-title font-semibold text-error">{title}</summary>
            <ul className="collapse-content space-y-1 max-h-60 overflow-y-auto">
                {issues.map((issue, index) => (
                    <li key={issue.file + index}>
                        <span className="font-medium">{issue.file}</span>: {issue.message}
                    </li>
                ))}
            </ul>
        </details>
    );
}
