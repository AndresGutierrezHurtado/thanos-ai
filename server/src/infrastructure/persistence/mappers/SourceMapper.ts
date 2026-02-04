import Source from "../../../domain/entities/source";
import Identifier from "../../../domain/valueObjects/Identifier";

export interface SourceDocument {
    chunkId: string;
    documentId: string | null;
    messageId: string | null;
    documentVersion: string;
    sourceType: "pdf" | "docx" | string;
    section: string;
    content: string;
}

export default class SourceMapper {
    public static toDomain(doc: SourceDocument): Source {
        return new Source(
            doc.chunkId,
            doc.documentId ? new Identifier(doc.documentId) : null,
            doc.messageId ? new Identifier(doc.messageId) : null,
            doc.documentVersion,
            doc.sourceType,
            doc.section,
            doc.content
        );
    }

    public static toPersistence(entity: Source): SourceDocument {
        return {
            chunkId: entity.getChunkId(),
            documentId: entity.getDocumentId()?.getValue() ?? null,
            messageId: entity.getMessageId()?.getValue() ?? null,
            documentVersion: entity.getDocumentVersion(),
            sourceType: entity.getSourceType(),
            section: entity.getSection(),
            content: entity.getContent(),
        };
    }
}
