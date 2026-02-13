import Source from "../../../domain/entities/source";
import { ChunkMetadata } from "./IChunker";

export interface VectorDocument {
    id: string;
    content: string;
    metadata: ChunkMetadata;
}

export default interface IVectorStore {
    addDocuments(collection: string, documents: VectorDocument[]): Promise<void>;
    deleteByDriveId(collection: string, driveId: string): Promise<void>;
    query(
        collection: string,
        queryText: string,
        nResults?: number,
    ): Promise<Source[]>;
}
