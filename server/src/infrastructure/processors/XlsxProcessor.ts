import * as XLSX from "xlsx";
import IDocumentProcessor, {
    ExtractedDocument,
} from "../../application/ports/provider/IDocumentProcessor";

export default class XlsxProcessor implements IDocumentProcessor {
    supports(mimeType: string): boolean {
        return (
            mimeType.includes("spreadsheet") ||
            mimeType.includes("excel") ||
            mimeType ===
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
    }

    async extract(buffer: Buffer): Promise<ExtractedDocument> {
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sections: { title: string; content: string }[] = [];

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            if (csv.trim()) {
                sections.push({ title: sheetName, content: csv.trim() });
            }
        }
        const fullText = sections
            .map((s) => `${s.title}\n${s.content}`)
            .join("\n\n");

        return {
            text: fullText,
            sections,
            metadata: { sourceType: "xlsx" },
        };
    }
}
