export interface ExtractedSection {
    title: string;
    content: string;
}

export interface ExtractedDocument {
    text: string;
    sections?: ExtractedSection[];
    metadata: { sourceType: string };
}

export default interface IDocumentProcessor {
    supports(mimeType: string): boolean;
    extract(buffer: Buffer): Promise<ExtractedDocument>;
}
