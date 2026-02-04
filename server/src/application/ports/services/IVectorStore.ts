import Source from "../../../domain/entities/source";
import Identifier from "../../../domain/valueObjects/Identifier";

export interface VectorDocument {
    id: string;
    content: string;
    metadata: Record<string, string | number | boolean | undefined>;
}

export default interface IVectorStore {
    addDocuments(collection: string, documents: VectorDocument[]): Promise<void>;
    deleteByDriveId(collection: string, driveId: string): Promise<void>;
    query(
        collection: string,
        queryText: string,
        nResults?: number,
        messageId?: Identifier | null
    ): Promise<Source[]>;
}
