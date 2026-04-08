import { Router } from "express";

import diContainer from "../../../infrastructure/config/DIContainer";
import { optionalAuth } from "../middlewares/authMiddleware";

const container = await diContainer.getInstance();
const authController = container.getAuthController();

const routes = Router();

routes.put("/auth/me", optionalAuth, authController.update.bind(authController));
routes.post("/auth/register", authController.register.bind(authController));
routes.post("/auth/login", authController.login.bind(authController));
routes.post("/auth/verify-email", authController.verifyEmail.bind(authController));
routes.post("/auth/forgot-password", authController.forgotPassword.bind(authController));
routes.post("/auth/reset-password", authController.resetPassword.bind(authController));

export default routes;
