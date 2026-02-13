import { Request, Response } from "express";

// Use Cases
import InformationUseCase from "../../../application/useCases/informationUseCase";
import { toSourceResourceArray } from "../../../application/ports/resources/SourceResource";

export default class DriveController {
    constructor(private readonly informationUseCase: InformationUseCase) {}

    public async syncDocuments(req: Request, res: Response): Promise<Response> {
        const result = await this.informationUseCase.syncDocuments();
        return res.status(200).json({
            success: true,
            message: "Documents synced successfully",
            data: result,
        });
    }

    public async listFiles(req: Request, res: Response): Promise<Response> {
        const files = await this.informationUseCase.listFiles();
        return res.status(200).json({
            success: true,
            message: "Files fetched successfully",
            data: files,
        });
    }

    public async listChromaFiles(req: Request, res: Response): Promise<Response> {
        const query = req.query.query as string;
        const files = await this.informationUseCase.listChromaFiles(query);
        return res.status(200).json({
            success: true,
            message: "Chroma files fetched successfully",
            data: toSourceResourceArray(files),
        });
    }

    public async downloadFile(req: Request, res: Response): Promise<Response | void> {
        const idParam = req.params.id;
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
