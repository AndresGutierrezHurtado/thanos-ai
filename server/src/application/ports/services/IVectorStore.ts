export interface VectorDocument {
    id: string;
    content: string;
    metadata: Record<string, string | number | boolean | undefined>;
}

export interface RetrieverResult {
    document: string;
    metadata: Record<string, string | number | boolean>;
}

export default interface IVectorStore {
    addDocuments(collection: string, documents: VectorDocument[]): Promise<void>;
    deleteByDriveId(collection: string, driveId: string): Promise<void>;
    query(
        collection: string,
        queryText: string,
        nResults?: number
    ): Promise<RetrieverResult[]>;
}
