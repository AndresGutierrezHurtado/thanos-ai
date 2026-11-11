import { ChatOpenAI } from "@langchain/openai";
import LangChainChatProvider, { ChatModelOptions } from "./LangChainChatProvider";

export interface AzureChatConfig {
    /** Azure OpenAI resource endpoint, e.g. https://my-resource.openai.azure.com */
    endpoint: string;
    apiKey?: string;
    /** Deployment name in Azure AI Foundry */
    deployment: string;
}

/**
 * Azure AI Foundry through its OpenAI-compatible v1 API (`/openai/v1`, no api-version):
 * same protocol as OpenAI, the deployment name goes in the `model` field.
 */
export default class AzureChatProvider extends LangChainChatProvider {
    constructor(private readonly config: AzureChatConfig) {
        super();
    }

    protected createModel({ temperature, maxTokens }: ChatModelOptions) {
        return new ChatOpenAI({
            model: this.config.deployment,
            apiKey: this.config.apiKey,
            configuration: { baseURL: azureV1BaseUrl(this.config.endpoint) },
            temperature,
            maxTokens,
        });
    }
}

/** Accepts the bare resource endpoint or one already ending in /openai/v1. */
export function azureV1BaseUrl(endpoint: string): string {
    const base = endpoint.replace(/\/+$/, "");
    return base.endsWith("/openai/v1") ? base : `${base}/openai/v1`;
}
