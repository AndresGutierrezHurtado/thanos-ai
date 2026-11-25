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

    /** Throws for types no processor reads: binaries (rar, zip...) would be indexed as garbage. */
    get(mimeType: string): IDocumentProcessor {
        const processor = this.processors.find((p) => p.supports(mimeType));
        if (!processor) throw new Error(`Tipo de archivo no soportado (${mimeType})`);
        return processor;
    }
}
