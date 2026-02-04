import Source from "../../domain/entities/source";

export interface SourceResource {
    chunkId: string;
    documentId: string | null;
    messageId: string | null;
    documentVersion: string;
    sourceType: "pdf" | "docx" | string;
    section: string;
    content: string;
}

export function toSourceResource(source: Source): SourceResource {
    return {
        chunkId: source.getChunkId(),
        documentId: source.getDocumentId()?.getValue() ?? null,
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
