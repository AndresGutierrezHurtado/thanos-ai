import Message from "../../../domain/entities/message";
import Source from "../../../domain/entities/source";

export type LlmProviderName = "gpt" | "ollama";

interface ILlmProvider {
    generateResponse(
        messages: Message[],
        maxTokens?: number,
        temperature?: number,
        extractedText?: string,
        onChunk?: (text: string) => void,
    ): Promise<{ response: string; sources: Source[] }>;
    generateConversationalResponse(
        messages: Message[],
        maxTokens?: number,
        temperature?: number,
    ): Promise<{ response: string; sources: Source[] }>;
    generateSimpleResponse(message: string): Promise<string>;
    speechToText(audio: Buffer): Promise<string>;
    textToSpeech(text: string): Promise<Buffer>;
}

export default ILlmProvider;
