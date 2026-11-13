import { Request, Response } from "express";

// Use Cases
import InformationUseCase, { UploadedFile } from "../../../application/useCases/informationUseCase";
import { toDocumentResourceArray } from "../../../application/ports/resources/DocumentResource";
import { DOCUMENT_SOURCES, DocumentSourceName } from "../../../domain/entities/document";

const PAGE_SIZE = 50;
// Must match the client batches (client/lib/uploadDocuments.js) and the body limit (index.ts)
const MAX_FILES_PER_UPLOAD = 50;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_DELETE_IDS = 500;

export default class DocumentController {
    constructor(private readonly informationUseCase: InformationUseCase) {}

    public async getSources(req: Request, res: Response): Promise<Response> {
        const sources = await this.informationUseCase.getSourcesOverview();
        return res.status(200).json({
            success: true,
            message: "Fuentes obtenidas",
            data: sources,
        });
    }

    public async list(req: Request, res: Response): Promise<Response> {
        const source = parseSource(req.query.source);
        const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 200) : "";
        const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);

        const { items, total } = await this.informationUseCase.listDocuments({
            source: source ?? undefined,
            search: search || undefined,
            page,
            pageSize: PAGE_SIZE,
        });

        return res.status(200).json({
            success: true,
            message: "Documentos obtenidos",
            data: { items: toDocumentResourceArray(items), total, page, pageSize: PAGE_SIZE },
        });
    }

    public async sync(req: Request, res: Response): Promise<Response> {
        const source = parseSource(req.body?.source);
        if (!source || !this.informationUseCase.getConfiguredSources().includes(source)) {
            return res.status(400).json({ success: false, message: "Fuente no válida o no configurada" });
        }

        const result = this.informationUseCase.startSync(source);
        if (result === "running") {
            return res.status(409).json({
                success: false,
                message: "Ya hay una sincronización en curso para esta fuente",
            });
        }

        return res.status(202).json({ success: true, message: "Sincronización iniciada" });
    }

    public async upload(req: Request, res: Response): Promise<Response> {
        const files: unknown = req.body?.files;
        if (!Array.isArray(files) || files.length === 0 || files.length > MAX_FILES_PER_UPLOAD) {
            return res.status(400).json({
                success: false,
                message: `Envía entre 1 y ${MAX_FILES_PER_UPLOAD} archivos por petición`,
            });
        }

        const accepted: UploadedFile[] = [];
        const rejected: { file: string; message: string }[] = [];

        for (const file of files) {
            const filePath = typeof file?.path === "string" ? file.path : "";
            if (!filePath || typeof file?.content !== "string") {
                rejected.push({ file: filePath || "(sin nombre)", message: "Archivo inválido" });
                continue;
            }

            const content = Buffer.from(file.content, "base64");
            if (content.length > MAX_FILE_BYTES) {
                rejected.push({ file: filePath, message: "Supera el tamaño máximo de 25 MB" });
                continue;
            }

            accepted.push({ path: filePath, content });
        }

        const result = await this.informationUseCase.uploadFiles(accepted);

        return res.status(200).json({
            success: true,
            message: `${result.saved} archivo(s) subido(s)`,
            data: { saved: result.saved, rejected: [...rejected, ...result.rejected] },
        });
    }

    public async delete(req: Request, res: Response): Promise<Response> {
        const driveIds: unknown = req.body?.driveIds;
        if (
            !Array.isArray(driveIds) ||
            driveIds.length === 0 ||
            driveIds.length > MAX_DELETE_IDS ||
            !driveIds.every((id) => typeof id === "string" && id.length > 0)
        ) {
            return res.status(400).json({
                success: false,
                message: `Envía entre 1 y ${MAX_DELETE_IDS} documentos`,
            });
        }

        const result = await this.informationUseCase.deleteDocuments(driveIds as string[]);

        return res.status(200).json({
            success: true,
            message: `${result.deleted} documento(s) eliminado(s)`,
            data: result,
        });
    }

    public async download(req: Request, res: Response): Promise<Response | void> {
        const idParam = req.params.driveId;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        if (!id || typeof id !== "string") {
            return res.status(400).json({
                success: false,
                message: "File ID is required",
            });
        }

        const fileData = await this.informationUseCase.downloadFileById(id);

        if (!fileData) {
            return res.status(404).json({
                success: false,
                message: "File not found",
            });
        }

        // Determinar la extensión del archivo basado en el mimeType
        const getExtension = (mimeType: string): string => {
            const mimeToExt: Record<string, string> = {
                "application/pdf": ".pdf",
                "application/vnd.google-apps.document": ".pdf",
                "application/vnd.google-apps.spreadsheet": ".pdf",
                "application/vnd.google-apps.presentation": ".pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
                "application/msword": ".doc",
                "application/vnd.ms-excel": ".xls",
                "application/vnd.ms-powerpoint": ".ppt",
                "text/plain": ".txt",
                "text/csv": ".csv",
            };

            return mimeToExt[mimeType] || "";
        };

        const extension = getExtension(fileData.mimeType);
        const filename = fileData.filename.endsWith(extension)
            ? fileData.filename
            : `${fileData.filename}${extension}`;

        res.setHeader("Content-Type", fileData.mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader("Content-Length", fileData.buffer.length.toString());

        return res.send(fileData.buffer);
    }
}

function parseSource(value: unknown): DocumentSourceName | null {
    return DOCUMENT_SOURCES.includes(value as DocumentSourceName) ? (value as DocumentSourceName) : null;
}
