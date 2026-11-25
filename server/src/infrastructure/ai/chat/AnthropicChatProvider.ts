import { ChatAnthropic } from "@langchain/anthropic";
import LangChainChatProvider, { ChatModelOptions } from "./LangChainChatProvider";

export interface AnthropicChatConfig {
    apiKey?: string;
    model: string;
}

export default class AnthropicChatProvider extends LangChainChatProvider {
    constructor(private readonly config: AnthropicChatConfig) {
        super();
    }

    protected createModel({ temperature, maxTokens }: ChatModelOptions) {
        return new ChatAnthropic({
            model: this.config.model,
            apiKey: this.config.apiKey,
            temperature,
            maxTokens,
        });
    }
}
