import Document from "../../../domain/entities/document";

export interface DocumentRecord {
    driveId: string;
    title: string;
    mimeType: string;
    version: string;
    checksum: string;
    normCode: string | null;
}

export default interface IDocumentRepository {
    findByDriveId(driveId: string): Promise<Document | null>;
    save(record: DocumentRecord): Promise<void>;
}
