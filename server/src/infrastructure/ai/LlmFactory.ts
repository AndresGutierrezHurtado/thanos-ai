import ILlmProvider, { LlmProviderName } from "../../application/ports/services/ILlmProvider";
import IVectorStore from "../../application/ports/services/IVectorStore";
import GptLlmProvider from "./GptLlmProvider";
import OllamaLlmProvider from "./OllamaLlmProvider";

export default class LlmFactory {
    private readonly providers: Record<LlmProviderName, ILlmProvider>;

    constructor(private readonly vectorStore: IVectorStore) {
        this.providers = {
            gpt: new GptLlmProvider(this.vectorStore),
            ollama: new OllamaLlmProvider(this.vectorStore),
        };
    }

    public getTextProvider(provider: LlmProviderName = "gpt"): ILlmProvider {
        return this.providers[provider] ?? this.providers.gpt;
    }

    public getAudioProvider(provider: LlmProviderName = "gpt"): ILlmProvider {
        return this.providers[provider] ?? this.providers.gpt;
    }
}
