import { OpenAIEmbeddings } from "@langchain/openai";
import LangChainEmbeddingProvider from "./LangChainEmbeddingProvider";
import { azureV1BaseUrl } from "../chat/AzureChatProvider";

export interface AzureEmbeddingConfig {
    /** Resource endpoint, e.g. https://my-resource.openai.azure.com */
    endpoint: string;
    apiKey?: string;
    /** Deployment name in Azure AI Foundry */
    deployment: string;
}

/** Azure AI Foundry embeddings through the OpenAI-compatible v1 API. */
export default class AzureEmbeddingProvider extends LangChainEmbeddingProvider {
    constructor(config: AzureEmbeddingConfig) {
        super(
            `azure:${config.deployment}`,
            new OpenAIEmbeddings({
                model: config.deployment,
                apiKey: config.apiKey,
                configuration: { baseURL: azureV1BaseUrl(config.endpoint) },
            }),
        );
    }
}
