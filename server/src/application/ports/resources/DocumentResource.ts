import Document, { DocumentFolder, DocumentSourceName } from "../../../domain/entities/document";

export interface DocumentResource {
    id: string;
    driveId: string;
    title: string;
    mimeType: string;
    normCode: string | null;
    version: string;
    checksum: string;
    processedAt: Date;
    path: string | null;
    source: DocumentSourceName;
    folders: DocumentFolder[];
    /** "Carpeta > Subcarpeta" */
    location: string;
}

export function toDocumentResource(document: Document): DocumentResource {
    return {
        id: document.getId()?.getValue() ?? "",
        driveId: document.getDriveId(),
        title: document.getTitle(),
        mimeType: document.getMimeType(),
        normCode: document.getNormCode(),
        version: document.getVersion(),
        checksum: document.getChecksum(),
        processedAt: document.getProcessedAt().getValue(),
        path: document.getPath() ?? null,
        source: document.getSource(),
        folders: document.getFolders(),
        location: document.getLocation(),
    };
}

export function toDocumentResourceArray(documents: Document[]): DocumentResource[] {
    return documents.map((document) => toDocumentResource(document));
}