import { ChromaClient } from "chromadb";
import IVectorStore, {
    VectorDocument,
    RetrieverResult,
} from "../../../application/ports/services/IVectorStore";
import IEmbeddingProvider from "../../../application/ports/provider/IEmbeddingProvider";

export default class ChromaVectorStore implements IVectorStore {
    private readonly client: ChromaClient;
    private readonly embeddingProvider: IEmbeddingProvider;

    constructor(embeddingProvider: IEmbeddingProvider) {
        const url = process.env.CHROMA_URL ?? "http://localhost:8000";
        const parsed = new URL(url);
        this.client = new ChromaClient({
            host: parsed.hostname,
            port: parseInt(parsed.port || "8000", 10),
        });
        this.embeddingProvider = embeddingProvider;
    }

    async addDocuments(collection: string, documents: VectorDocument[]): Promise<void> {
        if (documents.length === 0) return;
        const col = await this.client.getOrCreateCollection({ name: collection });
        const contents = documents.map((d) => d.content);
        const embeddings = await this.embeddingProvider.embed(contents);
        const metadatas = documents.map((d) => {
            const m: Record<string, string | number | boolean> = {};
            for (const [k, v] of Object.entries(d.metadata)) {
                if (v !== undefined && v !== null) {
                    m[k] = v as string | number | boolean;
                }
            }
            return m;
        });
        await col.add({
            ids: documents.map((d) => d.id),
            documents: contents,
            embeddings,
            metadatas,
        });
    }

    async deleteByDriveId(collection: string, driveId: string): Promise<void> {
        try {
            const col = await this.client.getOrCreateCollection({
                name: collection,
            });
            await col.delete({ where: { driveId: { $eq: driveId } } });
        } catch {
            /* collection may not exist */
        }
    }

    async query(
        collection: string,
        queryText: string,
        nResults = 5
    ): Promise<RetrieverResult[]> {
        const col = await this.client.getOrCreateCollection({ name: collection });
        const [embedding] = await this.embeddingProvider.embed([queryText]);
        const result = await col.query({
            queryEmbeddings: [embedding],
            nResults,
            include: ["documents", "metadatas"],
        });

        const documents = result.documents?.[0] ?? [];
        const metadatas = result.metadatas?.[0] ?? [];

        return documents.map((document, i) => ({
            document: document ?? "",
            metadata: (metadatas[i] ?? {}) as Record<
                string,
                string | number | boolean
            >,
        }));
    }
}
