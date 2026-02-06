import Document from "../../../domain/entities/document";
import Identifier from "../../../domain/valueObjects/Identifier";

export interface DocumentRecord {
    driveId: string;
    title: string;
    mimeType: string;
    version: string;
    checksum: string;
    normCode: string | null;
    path?: string;
}

export default interface IDocumentRepository {
    findByDriveId(driveId: string): Promise<Document | null>;
    findById(id: Identifier): Promise<Document | null>;
    save(record: DocumentRecord): Promise<void>;
}
