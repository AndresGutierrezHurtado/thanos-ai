import Identifier from "../valueObjects/Identifier";

// Entities
import Document from "./document";

export default class Source {
    private chunkId: string;
    private documentId: Identifier | null;
    private messageId: Identifier | null;
    private documentVersion: string;
    private sourceType: "pdf" | "docx" | string;
    private section: string;
    private content: string;

    private document: Document | null = null;

    constructor(
        chunkId: string,
        documentId: Identifier | null,
        messageId: Identifier | null,
        documentVersion: string,
        sourceType: "pdf" | "docx" | string,
        section: string,
        content: string,
    ) {
        this.chunkId = chunkId;
        this.documentId = documentId;
        this.messageId = messageId;
        this.documentVersion = documentVersion;
        this.sourceType = sourceType;
        this.section = section;
        this.content = content;
    }

    // Getters
    public getChunkId(): string {
        return this.chunkId;
    }

    public getDocumentId(): Identifier | null {
        return this.documentId;
    }

    public getMessageId(): Identifier | null {
        return this.messageId;
    }

    public getDocumentVersion(): string {
        return this.documentVersion;
    }

    public getSourceType(): "pdf" | "docx" | string {
        return this.sourceType;
    }

    public getSection(): string {
        return this.section;
    }

    public getContent(): string {
        return this.content;
    }

    public getDocument(): Document | null {
        return this.document;
    }

    // Setters
    public setChunkId(chunkId: string): void {
        this.chunkId = chunkId;
    }

    public setDocumentId(documentId: Identifier | null): void {
        this.documentId = documentId;
    }

    public setMessageId(messageId: Identifier | null): void {
        this.messageId = messageId;
    }

    public setDocumentVersion(documentVersion: string): void {
        this.documentVersion = documentVersion;
    }

    public setSourceType(sourceType: "pdf" | "docx" | string): void {
        this.sourceType = sourceType;
    }

    public setSection(section: string): void {
        this.section = section;
    }

    public setContent(content: string): void {
        this.content = content;
    }

    public setDocument(document: Document): void {
        this.document = document;
    }
}
