import type { DocumentRecord } from "../../../application/ports/repositories/IDocumentRepository";
import Identifier from "../../../domain/valueObjects/Identifier";
import DateTimeValue from "../../../domain/valueObjects/DateTimeValue";
import Document from "../../../domain/entities/document";

export interface DocumentMongoDoc {
    _id?: string;
    driveId: string;
    title: string;
    mimeType: string;
    normCode: string | null;
    version: string;
    checksum: string;
    updatedAt: Date;
    path?: string;
}

export default class DocumentMapper {
    public static toDomain(doc: DocumentMongoDoc): Document {
        const id = doc._id ? new Identifier(doc._id) : null;
        return new Document(
            id,
            doc.driveId,
            doc.title,
            doc.mimeType,
            doc.normCode,
            doc.version,
            doc.checksum,
            new DateTimeValue(doc.updatedAt),
            doc.path
        );
    }

    public static toPersistence(record: DocumentRecord): DocumentMongoDoc {
        return {
            driveId: record.driveId,
            title: record.title,
            mimeType: record.mimeType,
            normCode: record.normCode,
            version: record.version,
            checksum: record.checksum,
            updatedAt: new Date(),
            path: record.path,
        };
    }
}
