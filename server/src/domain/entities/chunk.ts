import Identifier from '../valueObjects/Identifier';
import DateTimeValue from '../valueObjects/DateTimeValue';

export default class Chunk {
    private id: Identifier;
    private documentId: Identifier;
    private content: string;
    private section: string;
    private embeddingId: string;
    private sourceType: string;
    private createdAt: DateTimeValue;

    constructor(
        id: Identifier,
        documentId: Identifier,
        content: string,
        section: string,
        embeddingId: string,
        sourceType: string,
        createdAt: DateTimeValue
    ) {
        this.id = id;
        this.documentId = documentId;
        this.content = content;
        this.section = section;
        this.embeddingId = embeddingId;
        this.sourceType = sourceType;
        this.createdAt = createdAt;
    }

    // Getters
    public getId(): Identifier {
        return this.id;
    }

    public getDocumentId(): Identifier {
        return this.documentId;
    }

    public getContent(): string {
        return this.content;
    }

    public getSection(): string {
        return this.section;
    }

    public getEmbeddingId(): string {
        return this.embeddingId;
    }

    public getSourceType(): string {
        return this.sourceType;
    }

    public getCreatedAt(): DateTimeValue {
        return this.createdAt;
    }

    // Setters
    public setId(id: Identifier): void {
        this.id = id;
    }

    public setDocumentId(documentId: Identifier): void {
        this.documentId = documentId;
    }

    public setContent(content: string): void {
        this.content = content;
    }

    public setSection(section: string): void {
        this.section = section;
    }

    public setEmbeddingId(embeddingId: string): void {
        this.embeddingId = embeddingId;
    }

    public setSourceType(sourceType: string): void {
        this.sourceType = sourceType;
    }

    public setCreatedAt(createdAt: DateTimeValue): void {
        this.createdAt = createdAt;
    }
}

