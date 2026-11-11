export default interface IEmbeddingProvider {
    /**
     * Stable identifier of the embedding model (e.g. "openai:text-embedding-3-small").
     * Vectors from different models are not comparable, so vector stores use it to
     * refuse mixing them in one collection.
     */
    readonly modelId: string;
    embedDocuments(texts: string[]): Promise<number[][]>;
    embedQuery(text: string): Promise<number[]>;
}
