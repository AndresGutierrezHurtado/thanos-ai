import type { DocumentRecord } from "../../../application/ports/repositories/IDocumentRepository";

export interface DocumentMongoDoc {
    driveId: string;
    title: string;
    mimeType: string;
    version: string;
    checksum: string;
    updatedAt: Date;
}

export default class DocumentMapper {
    public static toRecord(doc: DocumentMongoDoc): DocumentRecord {
        return {
            driveId: doc.driveId,
            title: doc.title,
            mimeType: doc.mimeType,
            version: doc.version,
            checksum: doc.checksum,
        };
    }

    public static toPersistence(record: DocumentRecord): DocumentMongoDoc {
        return {
            driveId: record.driveId,
            title: record.title,
            mimeType: record.mimeType,
            version: record.version,
            checksum: record.checksum,
            updatedAt: new Date(),
        };
    }
}
