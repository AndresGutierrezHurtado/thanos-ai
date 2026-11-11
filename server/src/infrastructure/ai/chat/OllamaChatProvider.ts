import { ChatOllama } from "@langchain/ollama";
import LangChainChatProvider, { ChatModelOptions } from "./LangChainChatProvider";

export interface OllamaChatConfig {
    baseUrl?: string;
    /** Must support tool calling (e.g. llama3.1, qwen2.5) for document search to work */
    model: string;
}

export default class OllamaChatProvider extends LangChainChatProvider {
    constructor(private readonly config: OllamaChatConfig) {
        super();
    }

    protected createModel({ temperature, maxTokens }: ChatModelOptions) {
        return new ChatOllama({
            baseUrl: this.config.baseUrl,
            model: this.config.model,
            temperature,
            numPredict: maxTokens,
        });
    }
}
