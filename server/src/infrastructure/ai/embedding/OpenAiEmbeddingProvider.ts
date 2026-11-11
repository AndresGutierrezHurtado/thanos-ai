import { OpenAIEmbeddings } from "@langchain/openai";
import LangChainEmbeddingProvider from "./LangChainEmbeddingProvider";

export interface OpenAiEmbeddingConfig {
    apiKey?: string;
    model: string;
    /** Any OpenAI-compatible server (LM Studio, vLLM, LocalAI...) */
    baseUrl?: string;
}

export default class OpenAiEmbeddingProvider extends LangChainEmbeddingProvider {
    constructor(config: OpenAiEmbeddingConfig) {
        super(
            `openai:${config.model}`,
            new OpenAIEmbeddings({
                apiKey: config.apiKey,
                model: config.model,
                configuration: config.baseUrl ? { baseURL: config.baseUrl } : undefined,
            }),
        );
    }
}
