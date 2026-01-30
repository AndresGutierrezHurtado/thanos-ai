import IDocumentProcessor, {
    ExtractedDocument,
} from "../../application/ports/provider/IDocumentProcessor";

export default class TextProcessor implements IDocumentProcessor {
    supports(mimeType: string): boolean {
        return (
            mimeType.startsWith("text/") ||
            mimeType === "application/json" ||
            mimeType === "application/xml"
        );
    }

    async extract(buffer: Buffer): Promise<ExtractedDocument> {
        const text = buffer.toString("utf-8");
        return { text, metadata: { sourceType: "text" } };
    }
}
