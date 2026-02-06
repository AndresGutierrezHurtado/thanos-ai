import { Router } from "express";
import DIContainer from "../../../infrastructure/config/DIContainer";

const diContainer = await DIContainer.getInstance();
const healthController = diContainer.getHealthController();

const routes = Router();

routes.get("/health", healthController.getHealthStatus.bind(healthController));
routes.get("/logs", healthController.getLogs.bind(healthController));

export default routes;
