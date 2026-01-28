import ILlmProvider from "../../application/ports/provider/ILlmProvider";
import Message from "../../domain/entities/message";
import MessageRole from "../../domain/valueObjects/MessageRole";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";
import Identifier from "../../domain/valueObjects/Identifier";

export default class LlmProvider implements ILlmProvider {
    public async generateResponse(messages: Message[]): Promise<Message> {
        const lastMessage = messages[messages.length - 1];
        const chatId = lastMessage.getChatId();

        const responseContent = `Echo: ${lastMessage.getContent()}`;

        const response = new Message(
            null,
            chatId,
            MessageRole.ASSISTANT,
            responseContent,
            null,
            new DateTimeValue(),
            null
        );

        // As with repositories, assign an id when creating the message
        if (!response.getId()) {
            const newId = new Identifier(
                `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
            );
            response.setId(newId);
        }

        return response;
    }
}

