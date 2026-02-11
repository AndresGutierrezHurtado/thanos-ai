import IDocumentProcessor, {
    ExtractedDocument,
} from "../../application/ports/services/IDocumentProcessor";
import ILlmProvider from "../../application/ports/services/ILlmProvider";

export default class ImageProcessor implements IDocumentProcessor {
    private supportedMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
    ];

    constructor( private readonly llmProvider: ILlmProvider) {
    }

    supports(mimeType: string): boolean {
        throw new Error("Not implemented");
        return this.supportedMimeTypes.includes(mimeType.toLowerCase());
    }

    async extract(buffer: Buffer, mimeType: string = "image/jpeg"): Promise<ExtractedDocument> {
        const text = await this.llmProvider.imageToText(buffer, mimeType);

        return {
            text,
            metadata: { sourceType: "image" },
        };
    }
}
