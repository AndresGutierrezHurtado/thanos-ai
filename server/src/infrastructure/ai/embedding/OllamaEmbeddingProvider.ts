import { OllamaEmbeddings } from "@langchain/ollama";
import LangChainEmbeddingProvider from "./LangChainEmbeddingProvider";

export interface OllamaEmbeddingConfig {
    baseUrl?: string;
    model: string;
}

export default class OllamaEmbeddingProvider extends LangChainEmbeddingProvider {
    constructor(config: OllamaEmbeddingConfig) {
        super(`ollama:${config.model}`, new OllamaEmbeddings({ baseUrl: config.baseUrl, model: config.model }));
    }
}
