import { Request, Response } from "express";

// Use Cases
import InformationUseCase from "../../../application/useCases/informationUseCase";

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
            data: files,
        });
    }
}
