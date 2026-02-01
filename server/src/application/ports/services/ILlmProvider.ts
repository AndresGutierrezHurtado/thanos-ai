import Message from "../../../domain/entities/message";
import Chat from "../../../domain/entities/chat";
import Source from "../../../domain/entities/source";

interface ILlmProvider {
    generateResponse(
        chat: Chat,
        messages: Message[],
        onChunk?: (text: string) => void
    ): Promise<{ message: Message, sources: Source[] }>;
    generateSimpleResponse(chat: Chat, messages: Message[]): Promise<{ message: Message, sources: Source[] }>;
    generateChatTitle(content: string): Promise<string>;
    speechToText(audio: Buffer): Promise<string>;
    textToSpeech(text: string): Promise<Buffer>;
}

export default ILlmProvider;
