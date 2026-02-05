import IDocumentProcessor, {
    ExtractedDocument,
} from "../../application/ports/provider/IDocumentProcessor";
import OpenAiModel from "../providers/OpenAiModel";

export default class ImageProcessor implements IDocumentProcessor {
    private openAiModel: OpenAiModel;

    private supportedMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
    ];

    constructor() {
        this.openAiModel = new OpenAiModel();
    }

    supports(mimeType: string): boolean {
        throw new Error("Not implemented");
        return this.supportedMimeTypes.includes(mimeType.toLowerCase());
    }

    async extract(buffer: Buffer, mimeType: string = "image/jpeg"): Promise<ExtractedDocument> {
        const text = await this.openAiModel.imageToText(buffer, mimeType);

        return {
            text,
            metadata: { sourceType: "image" },
        };
    }
}
