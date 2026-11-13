import { API_URL } from "@/lib/api";
import { getToken } from "@/lib/authStorage";
import { useApi } from "@/hooks/useApi";
import toBase64 from "@/lib/toBase64";

// Must match server/src/infrastructure/drive/LocalFileSystemProvider.ts
export const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".pptx", ".txt", ".md", ".csv", ".json", ".xml"];

// Must match server/src/presentation/http/controllers/documentController.ts
const MAX_FILE_BYTES = 25 * 1024 * 1024;
// Batches keep the request count low (the API is rate limited) and the body under 40 MB
const MAX_BATCH_BYTES = 20 * 1024 * 1024;
const MAX_BATCH_FILES = 25;

export const SOURCE_LABELS = {
    drive: "Google Drive",
    local: "Archivos subidos",
};

function relativePath(file) {
    // Folder uploads keep their structure ("Calidad/Procedimientos/x.pdf")
    return file.webkitRelativePath || file.name;
}

/** Splits picked files into uploadable ones and skipped ones (with the reason). */
export function filterUploadable(files) {
    const accepted = [];
    const skipped = [];

    for (const file of files) {
        const name = file.name.toLowerCase();
        const extension = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";

        if (name.startsWith(".") || name.startsWith("~$")) continue;
        if (!SUPPORTED_EXTENSIONS.includes(extension)) {
            skipped.push({ file: relativePath(file), message: "Tipo de archivo no soportado" });
        } else if (file.size > MAX_FILE_BYTES) {
            skipped.push({ file: relativePath(file), message: "Supera el tamaño máximo de 25 MB" });
        } else {
            accepted.push(file);
        }
    }

    return { accepted, skipped };
}

function toBatches(files) {
    const batches = [];
    let current = [];
    let bytes = 0;

    for (const file of files) {
        if (current.length && (current.length >= MAX_BATCH_FILES || bytes + file.size > MAX_BATCH_BYTES)) {
            batches.push(current);
            current = [];
            bytes = 0;
        }
        current.push(file);
        bytes += file.size;
    }
    if (current.length) batches.push(current);
    return batches;
}

/**
 * Uploads files in sequential batches. Stops at the first failed request and reports how far
 * it got: files already uploaded stay on the server and are indexed.
 */
export async function uploadDocuments(files, onProgress) {
    let saved = 0;
    let sent = 0;
    const rejected = [];

    for (const batch of toBatches(files)) {
        const payload = await Promise.all(
            batch.map(async (file) => ({ path: relativePath(file), content: await toBase64(file) })),
        );

        const response = await useApi("POST", "/documents/upload", { files: payload });
        if (!response?.success) {
            throw new Error(
                `${response?.message ?? "Error al subir archivos"} (${saved} de ${files.length} subidos)`,
            );
        }

        saved += response.data.saved;
        rejected.push(...response.data.rejected);
        sent += batch.length;
        onProgress?.(sent, files.length);
    }

    return { saved, rejected };
}

/** Fetches a document file with the session token (the endpoint requires auth). */
export async function fetchDocumentFile(driveId) {
    const token = getToken();
    const res = await fetch(`${API_URL}/documents/${encodeURIComponent(driveId)}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error al descargar");
    }

    let filename = null;
    const disposition = res.headers.get("Content-Disposition");
    const match = disposition?.match(/filename=["']?([^"';]+)["']?/i);
    if (match) filename = decodeURIComponent(match[1].trim());

    return { blob: await res.blob(), filename };
}

export async function downloadDocument(driveId, fallbackName = "documento") {
    const { blob, filename } = await fetchDocumentFile(driveId);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename || fallbackName;
    a.click();
    URL.revokeObjectURL(a.href);
}
