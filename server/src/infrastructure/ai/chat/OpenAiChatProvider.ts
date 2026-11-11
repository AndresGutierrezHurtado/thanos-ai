import { ChatOpenAI } from "@langchain/openai";
import LangChainChatProvider, { ChatModelOptions } from "./LangChainChatProvider";

export interface OpenAiChatConfig {
    apiKey?: string;
    model: string;
    /** Any OpenAI-compatible server (LM Studio, vLLM, LocalAI...) */
    baseUrl?: string;
}

export default class OpenAiChatProvider extends LangChainChatProvider {
    constructor(private readonly config: OpenAiChatConfig) {
        super();
    }

    protected createModel({ temperature, maxTokens }: ChatModelOptions) {
        return new ChatOpenAI({
            model: this.config.model,
            apiKey: this.config.apiKey,
            configuration: this.config.baseUrl ? { baseURL: this.config.baseUrl } : undefined,
            temperature,
            maxTokens,
        });
    }
}
