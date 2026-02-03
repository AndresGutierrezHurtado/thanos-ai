import { Router } from "express";

// DI Container
import diContainer from "../../config/DIContainer";

const container = await diContainer.getInstance();
const chatController = container.getChatController();

const routes = Router();

routes.get("/chats", chatController.getChats.bind(chatController));
routes.get("/chats/:id", chatController.getChatById.bind(chatController));
routes.post("/chats", chatController.createChat.bind(chatController));
routes.delete("/chats/:id", chatController.deleteChat.bind(chatController));

export default routes;
