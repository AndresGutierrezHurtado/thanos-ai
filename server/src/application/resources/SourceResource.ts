import Source from "../../domain/entities/source";
import Document from "../../domain/entities/document";

import { DocumentResource, toDocumentResource } from "./DocumentResource";

export interface SourceResource {
    chunkId: string;
    document: DocumentResource | null;
    messageId: string | null;
    documentVersion: string;
    sourceType: "pdf" | "docx" | string;
    section: string;
    content: string;
}

export function toSourceResource(source: Source): SourceResource {
    return {
        chunkId: source.getChunkId(),
        document: source.getDocument() ? toDocumentResource(source.getDocument() as Document) : null,
        messageId: source.getMessageId()?.getValue() ?? null,
        documentVersion: source.getDocumentVersion(),
        sourceType: source.getSourceType(),
        section: source.getSection(),
        content: source.getContent(),
    };
}

export function toSourceResourceArray(sources: Source[]): SourceResource[] {
    return sources.map((source) => toSourceResource(source));
}
