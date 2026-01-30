import { Router, Request, Response } from "express";

// DI Container
import diContainer from "../../config/DIContainer";

const routes = Router();

routes.get("/drive/files", async (req: Request, res: Response) => {
    const container = await diContainer.getInstance();
    const driveProvider = container.getDriveProvider();
    const files = await driveProvider.listFiles();
    return res.status(200).json({
        success: true,
        message: "Files fetched successfully",
        data: files,
    });
});

routes.post("/drive/sync", async (req: Request, res: Response) => {
    const container = await diContainer.getInstance();
    const informationUseCase = container.getInformationUseCase();
    const result = await informationUseCase.syncDocuments();
    return res.status(200).json({
        success: true,
        message: "Sync completed",
        data: result,
    });
});

export default routes;