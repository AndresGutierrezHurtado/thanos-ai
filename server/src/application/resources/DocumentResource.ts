import Document from "../../domain/entities/document";

export interface DocumentResource {
    id: string;
    driveId: string;
    title: string;
    mimeType: string;
    normCode: string | null;
    version: string;
    checksum: string;
    processedAt: Date;
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
    };
}

export function toDocumentResourceArray(documents: Document[]): DocumentResource[] {
    return documents.map((document) => toDocumentResource(document));
}