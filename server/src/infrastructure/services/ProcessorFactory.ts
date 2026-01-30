import IDocumentProcessor from "../../application/ports/provider/IDocumentProcessor";
import resolveFileType from "../../application/utils/resolveFileType";
import PdfProcessor from "../processors/PdfProcessor";
import DocxProcessor from "../processors/DocxProcessor";
import XlsxProcessor from "../processors/XlsxProcessor";
import TextProcessor from "../processors/TextProcessor";

export default class ProcessorFactory {
    private readonly processors: IDocumentProcessor[] = [
        new PdfProcessor(),
        new DocxProcessor(),
        new XlsxProcessor(),
        new TextProcessor(),
    ];

    get(mimeType: string): IDocumentProcessor {
        const processor = this.processors.find((p) => p.supports(mimeType));
        if (!processor) {
            const fileType = resolveFileType(mimeType);
            if (fileType === "image") {
                throw new Error(
                    `OCR para imágenes no implementado. MimeType: ${mimeType}`
                );
            }
            return this.processors.find((p) => p instanceof TextProcessor)!;
        }
        return processor;
    }
}
