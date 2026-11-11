export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
    role: ChatRole;
    content: string;
}

/** A function the model may call. `parameters` is the JSON Schema of its arguments object. */
export interface ChatTool {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute(args: Record<string, unknown>): Promise<string>;
}

export interface ChatRequest {
    messages: ChatMessage[];
    tools?: ChatTool[];
    temperature?: number;
    maxTokens?: number;
    /** When set, the response is streamed and each text fragment is passed here. */
    onChunk?: (text: string) => void;
}

export default interface IChatProvider {
    /** Runs the conversation (calling tools as the model requests) and returns the final text. */
    chat(request: ChatRequest): Promise<string>;
}
