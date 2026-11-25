import { Router } from "express";

// DI Container
import diContainer from "../../../infrastructure/config/DIContainer";
import { requireAuth } from "../middlewares/authMiddleware";

const container = await diContainer.getInstance();
const documentController = container.getDocumentController();

const routes = Router();
routes.use("/documents", requireAuth);

routes.get("/documents", documentController.list.bind(documentController));
routes.get("/documents/mentions", documentController.mentions.bind(documentController));
routes.get("/documents/sources", documentController.getSources.bind(documentController));
routes.post("/documents/sync", documentController.sync.bind(documentController));
routes.post("/documents/upload", documentController.upload.bind(documentController));
routes.delete("/documents", documentController.delete.bind(documentController));
routes.get("/documents/:driveId/download", documentController.download.bind(documentController));
routes.get("/documents/:driveId/chunks", documentController.chunks.bind(documentController));
routes.post("/documents/:driveId/refresh", documentController.refresh.bind(documentController));

export default routes;
