import ILogger, { SyslogSeverity } from "../../application/ports/services/ILogger";
import IDocumentProcessor from "../../application/ports/provider/IDocumentProcessor";

// Processors
import PdfProcessor from "../processors/PdfProcessor";
import DocxProcessor from "../processors/DocxProcessor";
import XlsxProcessor from "../processors/XlsxProcessor";
import TextProcessor from "../processors/TextProcessor";
import ImageProcessor from "../processors/ImageProcessor";

export default class ProcessorFactory {
    private readonly processors: IDocumentProcessor[] = [
        new PdfProcessor(),
        new DocxProcessor(),
        new XlsxProcessor(),
        new TextProcessor(),
        new ImageProcessor(),
    ];

    constructor(private readonly logger: ILogger) {}

    get(mimeType: string): IDocumentProcessor {
        const processor = this.processors.find((p) => p.supports(mimeType));
        if (!processor) {
            this.logger.log(SyslogSeverity.WARNING, `No processor found for mimeType: ${mimeType}`);
            return this.processors.find((p) => p instanceof TextProcessor)!;
        }
        return processor;
    }
}
