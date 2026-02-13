import IDocumentProcessor, {
    ExtractedDocument,
} from "../../application/ports/services/IDocumentProcessor";
import { SyslogSeverity } from "../../application/ports/services/ILogger";
import LoggerAdapter from "../services/LoggerAdapter";

export default class TextProcessor implements IDocumentProcessor {
    supports(mimeType: string): boolean {
        return (
            mimeType.startsWith("text/") ||
            mimeType === "application/json" ||
            mimeType === "application/xml"
        );
    }

    async extract(buffer: Buffer): Promise<ExtractedDocument> {
        try {
            const text = buffer.toString("utf-8");
            return { text, metadata: { sourceType: "text" } };
        } catch (error) {
            const logger = new LoggerAdapter();
            logger.log(SyslogSeverity.ERROR, `Error extracting TEXT: ${error instanceof Error ? error.message : "Unknown error"}`, { error: error });
            return { text: "", metadata: { sourceType: "text" } };
        }
    }
}
