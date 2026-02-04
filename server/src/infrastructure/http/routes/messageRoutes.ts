import { Router } from "express";

// DI Container
import diContainer from "../../config/DIContainer";

const container = await diContainer.getInstance();
const messageController = container.getMessageController();

const routes = Router();

routes.post("/messages", messageController.sendMessage.bind(messageController));
routes.put("/messages/:id", messageController.updateMessage.bind(messageController));

export default routes;
