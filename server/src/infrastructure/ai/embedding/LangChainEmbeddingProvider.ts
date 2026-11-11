import type { Embeddings } from "@langchain/core/embeddings";
import IEmbeddingProvider from "../../../application/ports/services/IEmbeddingProvider";

/** Shared adapter over a LangChain embeddings model. Vendor subclasses only build the model. */
export default abstract class LangChainEmbeddingProvider implements IEmbeddingProvider {
    protected constructor(
        public readonly modelId: string,
        private readonly embeddings: Embeddings,
    ) {}

    embedDocuments(texts: string[]): Promise<number[][]> {
        return this.embeddings.embedDocuments(texts);
    }

    embedQuery(text: string): Promise<number[]> {
        return this.embeddings.embedQuery(text);
    }
}
