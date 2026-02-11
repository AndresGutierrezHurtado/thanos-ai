import ILlmProvider from "../../application/ports/services/ILlmProvider";
import GptLlmProvider from "./GptLlmProvider";

export default class LlmFactory {
    public static create(provider: string): ILlmProvider {
        switch (provider) {
            case "gpt":
                return new GptLlmProvider();
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }
}