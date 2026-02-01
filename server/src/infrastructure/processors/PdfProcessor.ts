import IDocumentProcessor, {
    ExtractedDocument,
} from "../../application/ports/services/IDocumentProcessor";
import { LoadParameters, PDFParse, VerbosityLevel } from "pdf-parse";
import LoggerAdapter from "../services/LoggerAdapter";
import { SyslogSeverity } from "../../application/ports/services/ILogger";

export default class PdfProcessor implements IDocumentProcessor {
    supports(mimeType: string): boolean {
        return mimeType === "application/pdf";
    }

    async extract(buffer: Buffer): Promise<ExtractedDocument> {
        try {
            const loadParams: LoadParameters = {
                data: new Uint8Array(buffer),
                verbosity: 0,
            };

            const parser = new PDFParse(loadParams);
            const result = await parser.getText();

            const text = result.text;
            const sections = this.splitIntoSections(text);

            return {
                text,
                sections: sections.length > 0 ? sections : undefined,
                metadata: { sourceType: "pdf" },
            };
        } catch (error) {
            const logger = new LoggerAdapter();
            logger.log(SyslogSeverity.ERROR, "Error extracting PDF", { error: error });
            return {
                text: "",
                sections: undefined,
                metadata: { sourceType: "pdf" },
            };
        }
    }

    private splitIntoSections(text: string): { title: string; content: string }[] {
        const lines = text.split("\n").filter((l) => l.trim());
        const sections: { title: string; content: string }[] = [];
        let currentSection: { title: string; content: string } | null = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const looksLikeHeading =
                trimmed.length < 100 &&
                (/^[\d.]+\s/.test(trimmed) ||
                    /^[IVXLCDM]+\.\s/.test(trimmed) ||
                    /^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(trimmed));

            if (looksLikeHeading && trimmed.length < 80) {
                if (currentSection && currentSection.content.trim()) {
                    sections.push(currentSection);
                }
                currentSection = { title: trimmed, content: "" };
            } else if (currentSection) {
                currentSection.content += (currentSection.content ? "\n" : "") + trimmed;
            } else {
                currentSection = { title: "Content", content: trimmed };
            }
        }
        if (currentSection && currentSection.content.trim()) {
            sections.push(currentSection);
        }
        return sections;
    }
}
