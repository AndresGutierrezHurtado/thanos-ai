import { ChromaClient, Collection } from "chromadb";
import BusinessTermNormalizer from "./BusinessTermNormalizer";

// DOMAIN
import Source from "../../domain/entities/source";
import Document from "../../domain/entities/document";

// PORTS
import IVectorStore, { VectorDocument } from "../../application/ports/services/IVectorStore";
import IDocumentRepository from "../../application/ports/repositories/IDocumentRepository";
import IEmbeddingProvider from "../../application/ports/services/IEmbeddingProvider";
import LoggerAdapter from "../services/LoggerAdapter";
import { SyslogSeverity } from "../../application/ports/services/ILogger";

// Collections created before the model was recorded were always indexed with this one.
const LEGACY_EMBEDDING_MODEL = "openai:text-embedding-3-small";

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
        const embeddings = await this.embeddingProvider.embedDocuments(contents);
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

    async query(collection: string, queryText: string, nCandidates = 20): Promise<Source[]> {
        const { normalizedText } = BusinessTermNormalizer.normalize(queryText);

        const col = await this.getCollection(collection);
        const embedding = await this.embeddingProvider.embedQuery(normalizedText);

        const result = await col.query({
            queryEmbeddings: [embedding],
            nResults: nCandidates,
            include: ["documents", "metadatas"],
        });

        const documents = result.documents?.[0] ?? [];
        const metadatas = result.metadatas?.[0] ?? [];
        const ids = result.ids?.[0] ?? [];

        const sources: Source[] = [];

        for (let i = 0; i < documents.length; i++) {
            const id = ids[i] ?? "";
            const metadata = metadatas[i] ?? {};
            const document = documents[i] ?? "";

            const driveDocument = await this.documentRepository.findByDriveId(
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

        const logger = new LoggerAdapter();
        logger.log(SyslogSeverity.DEBUG, `Vectorial search done '${queryText}' with ${sources.length} results`, { sources });

        return sources;
    }
}
