import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import {
    AIMessage,
    AIMessageChunk,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
} from "@langchain/core/messages";
import IChatProvider, { ChatMessage, ChatRequest, ChatTool } from "../../../application/ports/services/IChatProvider";

// Safety cap so a model that keeps calling tools cannot loop forever
const DEFAULT_MAX_TOOL_ROUNDS = 5;

export interface ChatModelOptions {
    temperature: number;
    maxTokens: number;
}

/**
 * Shared chat logic (message mapping, tool-calling loop, streaming) on top of a
 * LangChain chat model. Each vendor subclass only says how to build its model.
 */
export default abstract class LangChainChatProvider implements IChatProvider {
    protected abstract createModel(options: ChatModelOptions): BaseChatModel;

    async chat({
        messages,
        tools = [],
        temperature = 0.3,
        maxTokens = 500,
        maxToolRounds = DEFAULT_MAX_TOOL_ROUNDS,
        onChunk,
    }: ChatRequest): Promise<string> {
        const baseModel = this.createModel({ temperature, maxTokens });
        const definitions = tools.map(toToolDefinition);
        const model = tools.length > 0 ? baseModel.bindTools!(definitions) : baseModel;
        // Last round: tools stay declared (the history has tool calls) but none may be called
        const answerModel = tools.length > 0 ? baseModel.bindTools!(definitions, { tool_choice: "none" }) : baseModel;
        const history: BaseMessage[] = messages.map(toLangChainMessage);

        for (let round = 0; ; round++) {
            const current = round >= maxToolRounds ? answerModel : model;
            const reply = onChunk ? await streamReply(current, history, onChunk) : await current.invoke(history);
            const toolCalls = reply.tool_calls ?? [];
            if (toolCalls.length === 0) return reply.text;
            if (round >= maxToolRounds) {
                // Providers that ignore tool_choice "none" (Ollama) may still ask for tools here
                return reply.text || "No alcancé a completar la búsqueda. Intenta con una pregunta más específica.";
            }

            history.push(new AIMessage({ content: reply.content, tool_calls: toolCalls }));
            // Calls of one round are independent: run them together, keep their order
            const results = await Promise.all(
                toolCalls.map(async (call) => {
                    const tool = tools.find((t) => t.name === call.name);
                    if (!tool) return `Unknown tool "${call.name}"`;
                    try {
                        return await tool.execute(call.args);
                    } catch (err) {
                        // The model can retry or answer without it; one failing tool must not lose the answer
                        return `Error en ${call.name}: ${err instanceof Error ? err.message : String(err)}`;
                    }
                }),
            );
            toolCalls.forEach((call, i) => {
                history.push(new ToolMessage({ content: results[i], tool_call_id: call.id ?? call.name }));
            });
        }
    }
}

type Model = Pick<BaseChatModel, "invoke" | "stream">;

async function streamReply(model: Model, history: BaseMessage[], onChunk: (text: string) => void) {
    let full: AIMessageChunk | undefined;
    for await (const chunk of await model.stream(history)) {
        if (chunk.text) onChunk(chunk.text);
        full = full ? full.concat(chunk) : chunk;
    }
    return full ?? new AIMessageChunk("");
}

function toLangChainMessage({ role, content }: ChatMessage): BaseMessage {
    switch (role) {
        case "system":
            return new SystemMessage(content);
        case "user":
            return new HumanMessage(content);
        case "assistant":
            return new AIMessage(content);
    }
}

function toToolDefinition(tool: ChatTool) {
    return {
        type: "function" as const,
        function: { name: tool.name, description: tool.description, parameters: tool.parameters },
    };
}
