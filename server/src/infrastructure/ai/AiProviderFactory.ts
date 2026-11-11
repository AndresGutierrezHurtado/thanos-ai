import IChatProvider from "../../application/ports/services/IChatProvider";
import IEmbeddingProvider from "../../application/ports/services/IEmbeddingProvider";
import ISpeechProvider from "../../application/ports/services/ISpeechProvider";

import OpenAiChatProvider from "./chat/OpenAiChatProvider";
import OllamaChatProvider from "./chat/OllamaChatProvider";
import AzureChatProvider from "./chat/AzureChatProvider";
import OpenAiEmbeddingProvider from "./embedding/OpenAiEmbeddingProvider";
import OllamaEmbeddingProvider from "./embedding/OllamaEmbeddingProvider";
import AzureEmbeddingProvider from "./embedding/AzureEmbeddingProvider";
import OpenAiSpeechProvider from "./speech/OpenAiSpeechProvider";

/**
 * Picks each AI implementation from .env. This is the only place that reads AI
 * configuration; the implementations receive typed config objects.
 *
 *   AI_CHAT_PROVIDER      = openai | ollama | azure   (AI_CHAT_MODEL; Azure: deployment name)
 *   AI_EMBEDDING_PROVIDER = openai | ollama | azure   (AI_EMBEDDING_MODEL; Azure: deployment name)
 *   AI_SPEECH_PROVIDER    = openai
 */
export default class AiProviderFactory {
    static createChatProvider(): IChatProvider {
        const provider = env("AI_CHAT_PROVIDER") ?? "openai";
        const model = env("AI_CHAT_MODEL");

        switch (provider) {
            case "openai":
                return new OpenAiChatProvider({
                    apiKey: env("OPENAI_API_KEY"),
                    baseUrl: env("OPENAI_BASE_URL"),
                    model: model ?? "gpt-5.4-mini",
                });
            case "ollama":
                return new OllamaChatProvider({
                    baseUrl: env("OLLAMA_BASE_URL"),
                    model: model ?? "llama3.1",
                });
            case "azure":
                return new AzureChatProvider({
                    endpoint: required("AZURE_OPENAI_ENDPOINT", env("AZURE_OPENAI_ENDPOINT")),
                    apiKey: env("AZURE_OPENAI_API_KEY"),
                    deployment: required("AI_CHAT_MODEL", model),
                });
            default:
                throw unsupported("AI_CHAT_PROVIDER", provider, "openai, ollama, azure");
        }
    }

    static createEmbeddingProvider(): IEmbeddingProvider {
        const provider = env("AI_EMBEDDING_PROVIDER") ?? "openai";
        const model = env("AI_EMBEDDING_MODEL");

        switch (provider) {
            case "openai":
                return new OpenAiEmbeddingProvider({
                    apiKey: env("OPENAI_API_KEY"),
                    baseUrl: env("OPENAI_BASE_URL"),
                    model: model ?? "text-embedding-3-small",
                });
            case "ollama":
                return new OllamaEmbeddingProvider({
                    baseUrl: env("OLLAMA_BASE_URL"),
                    model: model ?? "nomic-embed-text",
                });
            case "azure":
                return new AzureEmbeddingProvider({
                    endpoint: required("AZURE_OPENAI_ENDPOINT", env("AZURE_OPENAI_ENDPOINT")),
                    apiKey: env("AZURE_OPENAI_API_KEY"),
                    deployment: required("AI_EMBEDDING_MODEL", model),
                });
            default:
                throw unsupported("AI_EMBEDDING_PROVIDER", provider, "openai, ollama, azure");
        }
    }

    static createSpeechProvider(): ISpeechProvider {
        const provider = env("AI_SPEECH_PROVIDER") ?? "openai";

        switch (provider) {
            case "openai":
                return new OpenAiSpeechProvider({
                    apiKey: env("OPENAI_API_KEY"),
                    sttModel: "whisper-1",
                    ttsModel: "tts-1",
                    voice: "echo",
                    language: "es",
                });
            default:
                throw unsupported("AI_SPEECH_PROVIDER", provider, "openai");
        }
    }
}

/** Reads an env var, treating empty values as unset. */
function env(name: string): string | undefined {
    return process.env[name]?.trim() || undefined;
}

function required(name: string, value: string | undefined): string {
    if (!value) throw new Error(`${name} is required for the selected provider`);
    return value;
}

function unsupported(name: string, value: string, allowed: string): Error {
    return new Error(`${name}="${value}" is not supported. Use one of: ${allowed}`);
}
