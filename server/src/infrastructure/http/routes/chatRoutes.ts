import { Router } from "express";

// DI Container
import diContainer from "../../config/DIContainer";

const container = await diContainer.getInstance();
const chatController = container.getChatController();

const routes = Router();

routes.get("/chats", chatController.getChats);
routes.get("/chats/:id", chatController.getChatById);
routes.post("/chats", chatController.createChat);
routes.delete("/chats/:id", chatController.deleteChat);

export default routes;
