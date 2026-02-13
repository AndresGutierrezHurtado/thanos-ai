import OfficeParser from "officeparser";
import IDocumentProcessor, {
    ExtractedDocument,
    ExtractedSection,
} from "../../application/ports/services/IDocumentProcessor";
import { SyslogSeverity } from "../../application/ports/services/ILogger";
import LoggerAdapter from "../services/LoggerAdapter";

export default class PptxProcessor implements IDocumentProcessor {
    supports(mimeType: string): boolean {
        return [
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ].includes(mimeType);
    }

    async extract(buffer: Buffer): Promise<ExtractedDocument> {
        const logger = new LoggerAdapter();
        const parser = await OfficeParser.parseOffice(buffer);

        try {
            const fullText = parser.toText();

            return {
                text: fullText.trim(),
                metadata: {
                    sourceType: "pptx",
                },
            };
        } catch (error) {
            logger.log(
                SyslogSeverity.ERROR,
                `Error extracting PPTX: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`,
                { error },
            );

            return {
                text: "",
                metadata: { sourceType: "pptx" },
            };
        }
    }
}
