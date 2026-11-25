import Source from "../../../domain/entities/source";
import { ChunkMetadata } from "./IChunker";

export interface VectorDocument {
    id: string;
    /** Stored and returned by searches */
    content: string;
    /** Embedded instead of `content` when set (e.g. content plus what document it is from) */
    embeddingText?: string;
    metadata: ChunkMetadata;
}

export interface VectorQueryOptions {
    /** Chunks to return; at most 2 come from the same document */
    limit: number;
    /** Only chunks of these documents (an empty list matches nothing) */
    driveIds?: string[];
    /** Only chunks of this file type (pdf, docx, xlsx...) */
    sourceType?: string;
}

export interface AddDocumentsOptions {
    /** Stops between batches: nothing more is added once aborted */
    signal?: AbortSignal;
    /** Called after each batch with the documents added so far */
    onProgress?: (added: number, total: number) => void;
}

export interface StoredChunk {
    id: string;
    content: string;
    metadata: Partial<ChunkMetadata>;
}

export default interface IVectorStore {
    addDocuments(collection: string, documents: VectorDocument[], options?: AddDocumentsOptions): Promise<void>;
    deleteByDriveId(collection: string, driveId: string): Promise<void>;
    /** The chunks indexed for a document, in document order, at most `limit`. */
    getByDriveId(collection: string, driveId: string, limit: number): Promise<StoredChunk[]>;
    query(collection: string, queryText: string, options: VectorQueryOptions): Promise<Source[]>;
}
