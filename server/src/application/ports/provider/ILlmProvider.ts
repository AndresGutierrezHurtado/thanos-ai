import Message from "../../../domain/entities/message";
import Chat from "../../../domain/entities/chat";

export interface RetrieveSource {
    section: string;
    norm: string;
    content: string;
}

export interface GenerateResponseResult {
    message: Message;
    sources: RetrieveSource[];
}

interface ILlmProvider {
    generateResponse(
        chat: Chat,
        messages: Message[],
        onChunk?: (text: string) => void
    ): Promise<GenerateResponseResult>;
    generateChatTitle(content: string): Promise<string>;
    speechToText(audio: Buffer): Promise<string>;
}

export default ILlmProvider;
