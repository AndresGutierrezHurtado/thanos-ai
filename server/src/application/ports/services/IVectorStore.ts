import Source from "../../../domain/entities/source";
import { ChunkMetadata } from "./IChunker";

export interface VectorDocument {
    id: string;
    content: string;
    metadata: ChunkMetadata;
}

export interface StoredChunk {
    id: string;
    content: string;
    metadata: Partial<ChunkMetadata>;
}

export default interface IVectorStore {
    addDocuments(collection: string, documents: VectorDocument[]): Promise<void>;
    deleteByDriveId(collection: string, driveId: string): Promise<void>;
    /** The chunks indexed for a document, in document order, at most `limit`. */
    getByDriveId(collection: string, driveId: string, limit: number): Promise<StoredChunk[]>;
    query(
        collection: string,
        queryText: string,
        nResults?: number,
    ): Promise<Source[]>;
}
