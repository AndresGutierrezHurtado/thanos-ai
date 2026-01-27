import Message from "../../../domain/entities/message";

interface ILlmProvider {
    generateResponse(messages: Message[]): Promise<Message>;
}

export default ILlmProvider;
