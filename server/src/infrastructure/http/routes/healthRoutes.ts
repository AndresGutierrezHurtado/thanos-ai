import { Router } from "express";
import DIContainer from "../../config/DIContainer";

const diContainer = await DIContainer.getInstance();
const healthController = diContainer.getHealthController();

const routes = Router();

routes.get("/health", healthController.getHealthStatus.bind(healthController));

export default routes;
