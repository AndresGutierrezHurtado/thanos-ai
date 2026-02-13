import IDocumentProcessor, {
    ExtractedDocument,
} from "../../application/ports/services/IDocumentProcessor";

export default class ImageProcessor implements IDocumentProcessor {
    private supportedMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
    ];

    supports(mimeType: string): boolean {
        return this.supportedMimeTypes.includes(mimeType.toLowerCase());
    }

    async extract(buffer: Buffer, mimeType: string = "image/jpeg"): Promise<ExtractedDocument> {
        throw new Error("Images not supported yet");

        const text = "";
        return {
            text,
            metadata: { sourceType: "image" },
        };
    }
}
