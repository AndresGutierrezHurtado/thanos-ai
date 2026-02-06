import { Router } from "express";

// DI Container
import diContainer from "../../../infrastructure/config/DIContainer";

const container = await diContainer.getInstance();
const driveController = container.getDriveController();

const routes = Router();

routes.get("/drive/files", driveController.listFiles.bind(driveController));

routes.post("/drive/sync", driveController.syncDocuments.bind(driveController));

export default routes;
