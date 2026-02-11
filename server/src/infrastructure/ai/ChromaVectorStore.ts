import { ChromaClient } from "chromadb";
import IVectorStore, { VectorDocument } from "../../application/ports/services/IVectorStore";
import Source from "../../domain/entities/source";
import IDocumentRepository from "../../application/ports/repositories/IDocumentRepository";
import Document from "../../domain/entities/document";
import BusinessTermNormalizer from "./BusinessTermNormalizer";
import { OpenAIEmbeddings } from "@langchain/openai";

export default class ChromaVectorStore implements IVectorStore {
    private readonly client: ChromaClient;
    private readonly documentRepository: IDocumentRepository;
    private inTransaction = false;
    private readonly pendingIdsByCollection = new Map<string, string[]>();

    constructor(documentRepository: IDocumentRepository) {
        const url = process.env.CHROMA_URL ?? "http://localhost:8000";
        const parsed = new URL(url);
        this.client = new ChromaClient({
            host: parsed.hostname,
            port: parseInt(parsed.port || "8000", 10),
        });

        // Dependencies
        this.documentRepository = documentRepository;
    }

    public async embed(texts: string[]): Promise<number[][]> {
        const embeddingModel = new OpenAIEmbeddings({
            model: "text-embedding-3-small",
            apiKey: process.env.OPENAI_API_KEY,
        });
        return embeddingModel.embedDocuments(texts);
    }

    async addDocuments(collection: string, documents: VectorDocument[]): Promise<void> {
        if (documents.length === 0) return;
        const col = await this.client.getOrCreateCollection({ name: collection });
        const contents = documents.map((d) => d.content);
        const embeddings = await this.embed(contents);
        const metadatas = documents.map((d) => {
            const m: Record<string, string | number | boolean> = {};
            for (const [k, v] of Object.entries(d.metadata)) {
                if (v !== undefined && v !== null) {
                    m[k] = v as string | number | boolean;
                }
            }
            return m;
        });
        const ids = documents.map((d) => d.id);
        await col.add({
            ids,
            documents: contents,
            embeddings,
            metadatas,
        });
        if (this.inTransaction) {
            const pending = this.pendingIdsByCollection.get(collection) ?? [];
            this.pendingIdsByCollection.set(collection, [...pending, ...ids]);
        }
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
        maxDistance = 0.3,
    ): Promise<Source[]> {
        const { normalizedText } = BusinessTermNormalizer.normalize(queryText);

        const col = await this.client.getOrCreateCollection({ name: collection });
        const [embedding] = await this.embed([normalizedText]);

        const result = await col.query({
            queryEmbeddings: [embedding],
            nResults,
            include: ["documents", "metadatas", "distances"],
        });

        const documents = result.documents?.[0] ?? [];
        const metadatas = result.metadatas?.[0] ?? [];
        const distances = result.distances?.[0] ?? [];
        const ids = result.ids?.[0] ?? [];

        const sources: Source[] = [];

        for (let i = 0; i < documents.length; i++) {
            const id = ids[i] ?? "";
            const metadata = metadatas[i] ?? {};
            const document = documents[i] ?? "";
            const distance = distances[i] ?? 0;

            if (distance < 1 - maxDistance) continue;

            const driveDocument: Document | null = await this.documentRepository.findByDriveId(
                metadata.driveId as string,
            );

            const source = new Source(
                id,
                driveDocument?.getId() ?? null,
                null,
                metadata.documentVersion as string,
                metadata.sourceType as string,
                metadata.section as string,
                document as string,
            );

            source.setDocument(driveDocument as Document);
            sources.push(source);
        }

        return sources;
    }

    async beginTransaction(): Promise<void> {
        this.inTransaction = true;
        this.pendingIdsByCollection.clear();
    }

    async commitTransaction(): Promise<void> {
        this.inTransaction = false;
        this.pendingIdsByCollection.clear();
    }

    async rollback(): Promise<void> {
        for (const [collectionName, ids] of this.pendingIdsByCollection) {
            if (ids.length === 0) continue;
            try {
                const col = await this.client.getOrCreateCollection({ name: collectionName });
                await col.delete({ ids });
            } catch {
                /* best-effort rollback */
            }
        }
        this.inTransaction = false;
        this.pendingIdsByCollection.clear();
    }
}
