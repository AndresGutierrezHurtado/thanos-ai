import Message from "../../../domain/entities/message";
import Source from "../../../domain/entities/source";

interface ILlmProvider {
    generateResponse(messages: Message[], maxTokens?: number, temperature?: number, onChunk?: (text: string) => void): Promise<{ response: string; sources: Source[] }>;
    generateConversationalResponse(
        messages: Message[],
        maxTokens?: number,
        temperature?: number,
    ): Promise<string>;
    generateSimpleResponse(message: string): Promise<string>;
    speechToText(audio: Buffer): Promise<string>;
    textToSpeech(text: string): Promise<Buffer>;
}

export default ILlmProvider;
