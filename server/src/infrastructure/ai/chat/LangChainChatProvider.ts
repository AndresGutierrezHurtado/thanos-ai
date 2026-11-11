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
const MAX_TOOL_ROUNDS = 5;

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

    async chat({ messages, tools = [], temperature = 0.3, maxTokens = 500, onChunk }: ChatRequest): Promise<string> {
        const baseModel = this.createModel({ temperature, maxTokens });
        const model = tools.length > 0 ? baseModel.bindTools!(tools.map(toToolDefinition)) : baseModel;
        const history: BaseMessage[] = messages.map(toLangChainMessage);

        for (let round = 0; ; round++) {
            const reply = onChunk ? await streamReply(model, history, onChunk) : await model.invoke(history);
            const toolCalls = reply.tool_calls ?? [];
            if (toolCalls.length === 0 || round >= MAX_TOOL_ROUNDS) {
                return reply.text;
            }

            history.push(new AIMessage({ content: reply.content, tool_calls: toolCalls }));
            for (const call of toolCalls) {
                const tool = tools.find((t) => t.name === call.name);
                const result = tool ? await tool.execute(call.args) : `Unknown tool "${call.name}"`;
                history.push(new ToolMessage({ content: result, tool_call_id: call.id ?? call.name }));
            }
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
