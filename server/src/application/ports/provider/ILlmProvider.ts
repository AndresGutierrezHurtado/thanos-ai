import Message from "../../../domain/entities/message";
import Chat from "../../../domain/entities/chat";

interface ILlmProvider {
    generateResponse(chat: Chat, messages: Message[]): Promise<Message>;
}

export default ILlmProvider;
