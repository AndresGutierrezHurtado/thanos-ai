import IDocumentProcessor from "../../application/ports/services/IDocumentProcessor";

// Processors
import PdfProcessor from "../processors/PdfProcessor";
import DocxProcessor from "../processors/DocxProcessor";
import XlsxProcessor from "../processors/XlsxProcessor";
import TextProcessor from "../processors/TextProcessor";
import ImageProcessor from "../processors/ImageProcessor";
import PptxProcessor from "../processors/PptxProcessor";

export default class ProcessorFactory {
    private readonly processors: IDocumentProcessor[] = [
        new PdfProcessor(),
        new DocxProcessor(),
        new XlsxProcessor(),
        new PptxProcessor(),
        new ImageProcessor(), 
        new TextProcessor(),
    ];

    get(mimeType: string): IDocumentProcessor {
        const processor = this.processors.find((p) => p.supports(mimeType));
        if (!processor) {
            return this.processors.find((p) => p instanceof TextProcessor)!;
        }
        return processor;
    }
}
