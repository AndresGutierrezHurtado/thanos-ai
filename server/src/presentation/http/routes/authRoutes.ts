import { Router } from "express";

import diContainer from "../../../infrastructure/config/DIContainer";

const container = await diContainer.getInstance();
const authController = container.getAuthController();

const routes = Router();

routes.post("/auth/register", authController.register.bind(authController));
routes.post("/auth/login", authController.login.bind(authController));

export default routes;
