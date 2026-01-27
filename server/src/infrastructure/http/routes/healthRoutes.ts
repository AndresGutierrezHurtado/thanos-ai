import { Router } from "express";
import HealthController from "../controllers/healthController";

const routes = Router();

routes.get("/health", HealthController.getHealth);

export default routes;
