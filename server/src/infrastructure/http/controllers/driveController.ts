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
}
