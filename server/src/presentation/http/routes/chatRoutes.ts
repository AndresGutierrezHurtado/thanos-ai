import { Router } from "express";

import diContainer from "../../../infrastructure/config/DIContainer";
import { optionalAuth } from "../middlewares/authMiddleware";

const container = await diContainer.getInstance();
const chatController = container.getChatController();

const routes = Router();
routes.use(optionalAuth);

routes.get("/chats", chatController.getChats.bind(chatController));
routes.get("/chats/:id", chatController.getChatById.bind(chatController));
routes.get("/chats/:id/messages", chatController.getMessagesByChatId.bind(chatController));
routes.post("/chats", chatController.createChat.bind(chatController));
routes.delete("/chats/:id", chatController.deleteChat.bind(chatController));

export default routes;
