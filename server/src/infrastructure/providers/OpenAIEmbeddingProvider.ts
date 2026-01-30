import { OpenAIEmbeddings } from "@langchain/openai";
import IEmbeddingProvider from "../../application/ports/provider/IEmbeddingProvider";

export default class OpenAIEmbeddingProvider implements IEmbeddingProvider {
    private embeddings: OpenAIEmbeddings;

    constructor() {
        this.embeddings = new OpenAIEmbeddings({
            model: "text-embedding-3-small",
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    async embed(texts: string[]): Promise<number[][]> {
        return this.embeddings.embedDocuments(texts);
    }
}
