export interface DocumentRecord {
    driveId: string;
    title: string;
    mimeType: string;
    version: string;
    checksum: string;
}

export default interface IDocumentRepository {
    findByDriveId(driveId: string): Promise<DocumentRecord | null>;
    save(record: DocumentRecord): Promise<void>;
}
