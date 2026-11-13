import Document, { DocumentSourceName } from "../../../domain/entities/document";
import Identifier from "../../../domain/valueObjects/Identifier";

export interface DocumentRecord {
    driveId: string;
    title: string;
    mimeType: string;
    version: string;
    checksum: string;
    normCode: string | null;
    path?: string;
    source: DocumentSourceName;
}

export interface DocumentListQuery {
    source?: DocumentSourceName;
    /** Case-insensitive match on title or path */
    search?: string;
    skip: number;
    limit: number;
}

export interface DocumentSourceStats {
    count: number;
    lastUpdatedAt: Date | null;
}

export default interface IDocumentRepository {
    findByDriveId(driveId: string): Promise<Document | null>;
    findById(id: Identifier): Promise<Document | null>;
    save(record: DocumentRecord): Promise<void>;
    list(query: DocumentListQuery): Promise<{ items: Document[]; total: number }>;
    getSourceStats(source: DocumentSourceName): Promise<DocumentSourceStats>;
    findDriveIdsBySource(source: DocumentSourceName): Promise<string[]>;
    deleteByDriveId(driveId: string): Promise<void>;
}
