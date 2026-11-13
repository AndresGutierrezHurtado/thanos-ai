import type { Embeddings } from "@langchain/core/embeddings";
import IEmbeddingProvider from "../../../application/ports/services/IEmbeddingProvider";
import { SyslogSeverity } from "../../../application/ports/services/ILogger";
import LoggerAdapter from "../../services/LoggerAdapter";

// Document indexing runs in long batches: on rate limits or provider outages, wait and
// retry instead of failing the file. Queries (chat) are not retried: a user is waiting.
const DOCUMENT_RETRIES = 3;
const DOCUMENT_RETRY_DELAY_MS = 60_000;

/** Shared adapter over a LangChain embeddings model. Vendor subclasses only build the model. */
export default abstract class LangChainEmbeddingProvider implements IEmbeddingProvider {
    protected constructor(
        public readonly modelId: string,
        private readonly embeddings: Embeddings,
    ) {}

    async embedDocuments(texts: string[]): Promise<number[][]> {
        for (let attempt = 1; ; attempt++) {
            try {
                return await this.embeddings.embedDocuments(texts);
            } catch (error) {
                if (attempt > DOCUMENT_RETRIES || !isTransient(error)) throw error;

                new LoggerAdapter().log(
                    SyslogSeverity.WARNING,
                    `[${this.modelId}] embedding failed (${errorMessage(error)}), retry ${attempt}/${DOCUMENT_RETRIES} in ${DOCUMENT_RETRY_DELAY_MS / 1000}s`,
                );
                await new Promise((resolve) => setTimeout(resolve, DOCUMENT_RETRY_DELAY_MS));
            }
        }
    }

    embedQuery(text: string): Promise<number[]> {
        return this.embeddings.embedQuery(text);
    }
}

/**
 * Rate limits (429), timeouts (408), server errors (5xx) and network errors (no HTTP status)
 * can succeed later. Other 4xx (bad key, input too long...) fail the same way every time.
 */
function isTransient(error: unknown): boolean {
    // OpenAI/Azure SDK errors carry `status`, Ollama's carry `status_code`
    const err = error as { status?: unknown; status_code?: unknown } | null;
    const status = err?.status ?? err?.status_code;
    if (typeof status !== "number") return true;
    return status === 408 || status === 429 || status >= 500;
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
