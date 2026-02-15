import { Router } from "express";

import diContainer from "../../../infrastructure/config/DIContainer";

const container = await diContainer.getInstance();
const authController = container.getAuthController();

const routes = Router();

routes.post("/auth/register", authController.register.bind(authController));
routes.post("/auth/login", authController.login.bind(authController));
routes.post("/auth/verify-email", authController.verifyEmail.bind(authController));
routes.post("/auth/forgot-password", authController.forgotPassword.bind(authController));
routes.post("/auth/reset-password", authController.resetPassword.bind(authController));

export default routes;
