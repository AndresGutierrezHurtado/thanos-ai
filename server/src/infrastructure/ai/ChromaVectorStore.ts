import { ChromaClient, Collection, Where } from "chromadb";

// DOMAIN
import Source from "../../domain/entities/source";
import Document from "../../domain/entities/document";

// PORTS
import IVectorStore, { StoredChunk, VectorDocument, VectorQueryOptions } from "../../application/ports/services/IVectorStore";
import { ChunkMetadata } from "../../application/ports/services/IChunker";
import IDocumentRepository from "../../application/ports/repositories/IDocumentRepository";
import IEmbeddingProvider from "../../application/ports/services/IEmbeddingProvider";
import LoggerAdapter from "../services/LoggerAdapter";
import { SyslogSeverity } from "../../application/ports/services/ILogger";

// Collections created before the model was recorded were always indexed with this one.
const LEGACY_EMBEDDING_MODEL = "openai:text-embedding-3-small";
// Chunks returned per document: more would let one long document fill every result
const MAX_CHUNKS_PER_DOCUMENT = 2;
// Candidates fetched per requested result, so there are enough after that per-document cap
const CANDIDATES_PER_RESULT = 4;
const MAX_CANDIDATES = 100;

export default class ChromaVectorStore implements IVectorStore {
    private readonly client: ChromaClient;

    constructor(
        private readonly documentRepository: IDocumentRepository,
        private readonly embeddingProvider: IEmbeddingProvider,
    ) {
        const url = process.env.CHROMA_URL ?? "http://localhost:8000";
        const parsed = new URL(url);
        this.client = new ChromaClient({
            host: parsed.hostname,
            port: parseInt(parsed.port || "8000", 10),
        });
    }

    /**
     * Gets (or creates) a collection tagged with the embedding model. Vectors from
     * different models are not comparable, so using a collection indexed with another
     * model fails loudly instead of returning meaningless search results.
     */
    private async getCollection(name: string): Promise<Collection> {
        const modelId = this.embeddingProvider.modelId;
        const col = await this.client.getOrCreateCollection({
            name,
            metadata: { embeddingModel: modelId },
        });
        const indexedWith = (col.metadata?.embeddingModel as string | undefined) ?? LEGACY_EMBEDDING_MODEL;
        if (indexedWith !== modelId) {
            throw new Error(
                `Chroma collection "${name}" was indexed with "${indexedWith}" but the configured ` +
                `embedding model is "${modelId}". Delete the collection and re-run sync:documents, ` +
                `or set AI_EMBEDDING_PROVIDER/AI_EMBEDDING_MODEL back.`,
            );
        }
        return col;
    }

    async addDocuments(collection: string, documents: VectorDocument[]): Promise<void> {
        if (documents.length === 0) return;

        // GETTING THE COLLECTION
        const col = await this.getCollection(collection);

        // GETTING THE CONTENTS, EMBEDDINGS AND METADATAS
        const contents = documents.map((d) => d.content);
        const embeddings = await this.embeddingProvider.embedDocuments(
            documents.map((d) => d.embeddingText ?? d.content),
        );
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

        // ADDING THE DOCUMENTS TO THE COLLECTION
        await col.add({
            ids,
            documents: contents,
            embeddings,
            metadatas,
        });
    }

    async deleteByDriveId(collection: string, driveId: string): Promise<void> {
        // Errors propagate: callers delete the document row only once its chunks are gone,
        // otherwise orphan chunks would keep answering in chat with no way to remove them
        const col = await this.getCollection(collection);
        await col.delete({ where: { driveId: { $eq: driveId } } });
    }

    async getByDriveId(collection: string, driveId: string, limit: number): Promise<StoredChunk[]> {
        const col = await this.getCollection(collection);
        const result = await col.get({
            where: { driveId: { $eq: driveId } },
            include: ["documents", "metadatas"],
            limit,
        });

        const chunks = result.ids.map((id, i) => ({
            id,
            content: result.documents[i] ?? "",
            metadata: (result.metadatas[i] ?? {}) as Partial<ChunkMetadata>,
        }));

        // Chunks indexed before chunkIndex existed keep the order Chroma returns, after the rest
        const position = (chunk: StoredChunk) => chunk.metadata.chunkIndex ?? Number.MAX_SAFE_INTEGER;
        return chunks.sort((a, b) => position(a) - position(b));
    }

    async query(collection: string, queryText: string, options: VectorQueryOptions): Promise<Source[]> {
        const { limit, driveIds, sourceType } = options;
        if (driveIds?.length === 0) return [];

        const clauses: Where[] = [];
        if (driveIds) clauses.push({ driveId: { $in: driveIds } });
        if (sourceType) clauses.push({ sourceType: { $eq: sourceType } });
        const where: Where | undefined = clauses.length > 1 ? { $and: clauses } : clauses[0];

        const col = await this.getCollection(collection);
        const embedding = await this.embeddingProvider.embedQuery(queryText);
        const result = await col.query({
            queryEmbeddings: [embedding],
            nResults: Math.min(limit * CANDIDATES_PER_RESULT, MAX_CANDIDATES),
            where,
            include: ["documents", "metadatas"],
        });

        const contents = result.documents?.[0] ?? [];
        const metadatas = result.metadatas?.[0] ?? [];
        const ids = result.ids?.[0] ?? [];

        // Best matches first, at most MAX_CHUNKS_PER_DOCUMENT per document
        const picked: number[] = [];
        const perDocument = new Map<string, number>();
        for (let i = 0; i < ids.length && picked.length < limit; i++) {
            const driveId = String(metadatas[i]?.driveId ?? "");
            const count = perDocument.get(driveId) ?? 0;
            if (count >= MAX_CHUNKS_PER_DOCUMENT) continue;
            perDocument.set(driveId, count + 1);
            picked.push(i);
        }

        const documents = await this.documentRepository.findByDriveIds([...perDocument.keys()]);
        const byDriveId = new Map(documents.map((document) => [document.getDriveId(), document]));

        const sources = picked.map((i) => {
            const metadata = metadatas[i] ?? {};
            const document = byDriveId.get(String(metadata.driveId)) ?? null;
            const source = new Source(
                ids[i],
                document?.getId() ?? null,
                null,
                metadata.documentVersion as string,
                metadata.sourceType as string,
                metadata.section as string,
                contents[i] ?? "",
            );
            source.setDocument(document as Document);
            return source;
        });

        new LoggerAdapter().log(
            SyslogSeverity.DEBUG,
            `Vectorial search done '${queryText}' (limit ${limit}${driveIds ? `, ${driveIds.length} documents` : ""}${sourceType ? `, ${sourceType}` : ""}) with ${sources.length} results`,
        );

        return sources;
    }
}
