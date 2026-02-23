import { LlmProviderName } from "../services/ILlmProvider";

export default interface UpdateMessageDto {
    id: string;
    content: string;
    provider?: LlmProviderName;
}
