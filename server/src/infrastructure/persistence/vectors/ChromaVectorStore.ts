import { ChromaClient } from "chromadb";
import IVectorStore, { VectorDocument } from "../../../application/ports/services/IVectorStore";
import IEmbeddingProvider from "../../../application/ports/provider/IEmbeddingProvider";
import LoggerAdapter from "../../services/LoggerAdapter";
import Source from "../../../domain/entities/source";
import Identifier from "../../../domain/valueObjects/Identifier";
import IDocumentRepository from "../../../application/ports/repositories/IDocumentRepository";
import Document from "../../../domain/entities/document";

export default class ChromaVectorStore implements IVectorStore {
    private readonly client: ChromaClient;
    private readonly embeddingProvider: IEmbeddingProvider;
    private readonly documentRepository: IDocumentRepository;

    constructor(embeddingProvider: IEmbeddingProvider, documentRepository: IDocumentRepository) {
        const url = process.env.CHROMA_URL ?? "http://localhost:8000";
        const parsed = new URL(url);
        this.client = new ChromaClient({
            host: parsed.hostname,
            port: parseInt(parsed.port || "8000", 10),
        });

        // Dependencies
        this.embeddingProvider = embeddingProvider;
        this.documentRepository = documentRepository;
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
        nResults = 5,
        messageId: Identifier | null = null
    ): Promise<Source[]> {
        const col = await this.client.getOrCreateCollection({ name: collection });
        const [embedding] = await this.embeddingProvider.embed([queryText]);
        const result = await col.query({
            queryEmbeddings: [embedding],
            nResults,
            include: ["documents", "metadatas"],
        });

        const logger = new LoggerAdapter();
        logger.debug("query", { result });

        const documents = result.documents?.[0] ?? [];
        const metadatas = result.metadatas?.[0] ?? [];
        const ids = result.ids?.[0] ?? [];

        const sources: Source[] = await Promise.all(
            documents.map(async (doc, index): Promise<Source> => {
                const metadata = metadatas[index] ?? {};
                const document: Document | null = await this.documentRepository.findByDriveId(ids[index] as string);

                const source = new Source(
                    ids[index] as string,
                    document?.getId() ?? null,
                    messageId,
                    metadata.documentVersion as string,
                    metadata.sourceType as string,
                    metadata.section as string,
                    doc as string
                );
                return source;
            })
        );

        return sources;
    }
}
