import type { DocumentRecord } from "../../../application/ports/repositories/IDocumentRepository";
import Identifier from "../../../domain/valueObjects/Identifier";
import DateTimeValue from "../../../domain/valueObjects/DateTimeValue";
import Document, { DocumentSourceName } from "../../../domain/entities/document";
import normalizeText from "../../../domain/services/normalizeText";

export interface FolderMongoDoc {
    id: string;
    name: string;
    /** Normalized name, for accent-insensitive search */
    search: string;
}

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
    /** Missing on documents indexed before uploads existed: those all came from Drive */
    source?: DocumentSourceName;
    // Missing on documents indexed before folders were recorded (indexVersion < 2)
    folders?: FolderMongoDoc[];
    folderIds?: string[];
    /** Normalized name and folder names, for accent-insensitive search */
    searchText?: string;
    indexVersion?: number;
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
            doc.path,
            doc.source ?? "drive",
            (doc.folders ?? []).map(({ id, name }) => ({ id, name })),
            doc.indexVersion ?? 0,
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
            source: record.source,
            folders: record.folders.map(({ id, name }) => ({ id, name, search: normalizeText(name) })),
            folderIds: record.folders.map((folder) => folder.id),
            searchText: normalizeText([record.title, ...record.folders.map((folder) => folder.name)].join(" ")),
            indexVersion: record.indexVersion,
        };
    }
}
