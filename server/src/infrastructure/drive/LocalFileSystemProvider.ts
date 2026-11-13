import path from "path";
import { promises as fs, Stats } from "fs";

import { DriveFile, IWritableDriveProvider } from "../../application/ports/services/IDriveProvider";

/** File types the document processors can extract text from. */
const MIME_BY_EXTENSION: Record<string, string> = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".csv": "text/csv",
    ".json": "application/json",
    ".xml": "application/xml",
};

// Files being written get this suffix and are renamed when complete, so a sync running at
// the same time never reads a half-written file
const PARTIAL_SUFFIX = ".uploading";

/**
 * Documents uploaded from the app, stored under one root folder. A file's id is its path
 * relative to the root, base64url-encoded: stable, URL-safe and reversible.
 */
export default class LocalFileSystemProvider implements IWritableDriveProvider {
    private readonly root: string;

    constructor(root: string) {
        this.root = path.resolve(root);
    }

    async listFiles(limit?: number): Promise<DriveFile[]> {
        await fs.mkdir(this.root, { recursive: true });
        const entries = await fs.readdir(this.root, { recursive: true, withFileTypes: true });

        const paths = entries
            .filter((entry) => entry.isFile() && isSupported(entry.name))
            .map((entry) => toRelative(this.root, path.join(entry.parentPath, entry.name)))
            .sort()
            .slice(0, limit);

        return Promise.all(
            paths.map(async (relative) => toDriveFile(relative, await fs.stat(this.absolute(relative)))),
        );
    }

    async downloadFile(fileId: string): Promise<Buffer> {
        return fs.readFile(this.absolute(decodeId(fileId)));
    }

    async getFileById(fileId: string): Promise<DriveFile | null> {
        try {
            const relative = decodeId(fileId);
            return toDriveFile(relative, await fs.stat(this.absolute(relative)));
        } catch {
            return null;
        }
    }

    async saveFile(filePath: string, content: Buffer): Promise<DriveFile> {
        const relative = normalizeRelative(filePath);
        if (!isSupported(relative)) {
            throw new Error(`Tipo de archivo no soportado (${path.extname(relative) || "sin extensión"})`);
        }

        const target = this.absolute(relative);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target + PARTIAL_SUFFIX, content);
        await fs.rename(target + PARTIAL_SUFFIX, target);

        return toDriveFile(relative, await fs.stat(target));
    }

    async deleteFile(fileId: string): Promise<void> {
        await fs.rm(this.absolute(decodeId(fileId)), { force: true });
    }

    /** Resolves a relative path inside the root; anything escaping it is rejected. */
    private absolute(relative: string): string {
        const target = path.resolve(this.root, normalizeRelative(relative));
        if (!target.startsWith(this.root + path.sep)) {
            throw new Error("Ruta de archivo inválida");
        }
        return target;
    }
}

function isSupported(fileName: string): boolean {
    const base = path.basename(fileName);
    // Hidden files and Office lock files (~$doc.docx) are not documents
    if (base.startsWith(".") || base.startsWith("~$")) return false;
    return path.extname(base).toLowerCase() in MIME_BY_EXTENSION;
}

/** "a\\b/../c" -> "a/c"; rejects absolute paths and paths leaving the root. */
function normalizeRelative(filePath: string): string {
    const normalized = path.posix.normalize(filePath.replace(/\\/g, "/"));
    if (
        !normalized ||
        normalized === "." ||
        normalized.includes("\0") ||
        path.posix.isAbsolute(normalized) ||
        path.win32.isAbsolute(normalized) ||
        normalized === ".." ||
        normalized.startsWith("../")
    ) {
        throw new Error("Ruta de archivo inválida");
    }
    return normalized;
}

function toRelative(root: string, absolute: string): string {
    return path.relative(root, absolute).split(path.sep).join("/");
}

function encodeId(relative: string): string {
    return Buffer.from(relative, "utf8").toString("base64url");
}

function decodeId(fileId: string): string {
    return Buffer.from(fileId, "base64url").toString("utf8");
}

function toDriveFile(relative: string, stats: Stats): DriveFile {
    return {
        id: encodeId(relative),
        name: path.posix.basename(relative),
        mimeType: MIME_BY_EXTENSION[path.extname(relative).toLowerCase()],
        // Used as the change checksum: replacing a file updates it and triggers re-indexing
        modifiedTime: stats.mtime.toISOString(),
        size: stats.size,
        path: relative,
    };
}
