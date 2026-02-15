import { Router } from "express";

import diContainer from "../../../infrastructure/config/DIContainer";
import { optionalAuth } from "../middlewares/authMiddleware";

const container = await diContainer.getInstance();
const messageController = container.getMessageController();

const routes = Router();
routes.use(optionalAuth);

routes.post("/messages", messageController.sendMessage.bind(messageController));
routes.put("/messages/:id", messageController.updateMessage.bind(messageController));

routes.post("/speech-to-text", messageController.speechToText.bind(messageController));

export default routes;
