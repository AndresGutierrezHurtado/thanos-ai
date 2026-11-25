import Document, { DocumentFolder, DocumentSourceName } from "../../../domain/entities/document";
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
    folders: DocumentFolder[];
    indexVersion: number;
}

export interface DocumentListQuery {
    source?: DocumentSourceName;
    /** Case-insensitive match on title or path */
    search?: string;
    skip: number;
    limit: number;
}

export interface DocumentFindQuery {
    /** Every word must appear in the name or folders (case and accent insensitive) */
    text?: string;
    /** Only documents inside this folder, at any depth */
    folderId?: string;
    limit: number;
}

export interface FolderSummary {
    id: string;
    name: string;
    /** "Carpeta > Subcarpeta", ending with this folder */
    location: string;
    /** Documents inside it, at any depth */
    documents: number;
}

export interface FolderListing {
    /** null for the root of all sources */
    folder: FolderSummary | null;
    folders: FolderSummary[];
    /** Documents directly in the folder, at most `limit` */
    documents: Document[];
    totalDocuments: number;
}

export interface DocumentSourceStats {
    count: number;
    lastUpdatedAt: Date | null;
}

export default interface IDocumentRepository {
    findByDriveId(driveId: string): Promise<Document | null>;
    findById(id: Identifier): Promise<Document | null>;
    findByDriveIds(driveIds: string[]): Promise<Document[]>;
    find(query: DocumentFindQuery): Promise<{ items: Document[]; total: number }>;
    /** Folders whose name matches every word of `text` (or with these ids) */
    findFolders(query: { text?: string; ids?: string[]; limit: number }): Promise<FolderSummary[]>;
    listFolder(folderId: string | null, limit: number): Promise<FolderListing>;
    save(record: DocumentRecord): Promise<void>;
    list(query: DocumentListQuery): Promise<{ items: Document[]; total: number }>;
    getSourceStats(source: DocumentSourceName): Promise<DocumentSourceStats>;
    findDriveIdsBySource(source: DocumentSourceName): Promise<string[]>;
    deleteByDriveId(driveId: string): Promise<void>;
}
