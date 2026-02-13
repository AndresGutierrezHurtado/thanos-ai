import * as XLSX from "xlsx";
import IDocumentProcessor, {
    ExtractedDocument,
} from "../../application/ports/services/IDocumentProcessor";
import { SyslogSeverity } from "../../application/ports/services/ILogger";
import LoggerAdapter from "../services/LoggerAdapter";

export default class XlsxProcessor implements IDocumentProcessor {
    private readonly MAX_ROWS_PER_CHUNK = 500;

    supports(mimeType: string): boolean {
        return (
            mimeType.includes("spreadsheet") ||
            mimeType.includes("excel") ||
            mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
    }

    async extract(buffer: Buffer): Promise<ExtractedDocument> {
        const logger = new LoggerAdapter();
        try {
            const workbook = XLSX.read(buffer, { type: "buffer" });
            const sections: { title: string; content: string }[] = [];

            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
                const totalRows = range.e.r - range.s.r + 1;

                if (totalRows <= this.MAX_ROWS_PER_CHUNK) {
                    const csv = XLSX.utils.sheet_to_csv(sheet);
                    if (csv.trim()) {
                        sections.push({ title: sheetName, content: csv.trim() });
                    }
                } else {
                    const chunks = this.splitSheetIntoChunks(sheet, sheetName, range);
                    sections.push(...chunks);
                }
            }

            const fullText = sections.map((s) => `${s.title}\n${s.content}`).join("\n\n");

            return {
                text: fullText,
                sections,
                metadata: { sourceType: "xlsx" },
            };
        } catch (error) {
            logger.log(SyslogSeverity.ERROR, `Error extracting XLSX: ${error instanceof Error ? error.message : "Unknown error"}`, { error: error });
            return {
                text: "",
                sections: undefined,
                metadata: { sourceType: "xlsx" },
            };
        }
    }

    private splitSheetIntoChunks(
        sheet: XLSX.WorkSheet,
        sheetName: string,
        range: XLSX.Range
    ): { title: string; content: string }[] {
        const chunks: { title: string; content: string }[] = [];
        const startRow = range.s.r;
        const endCol = range.e.c;

        const headers: string[] = [];
        for (let col = range.s.c; col <= endCol; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: startRow, c: col });
            const cell = sheet[cellAddress];
            headers.push(cell ? String(cell.v) : `Column${col}`);
        }

        let chunkIndex = 0;
        for (let rowStart = startRow + 1; rowStart <= range.e.r; rowStart += this.MAX_ROWS_PER_CHUNK) {
            const rowEnd = Math.min(rowStart + this.MAX_ROWS_PER_CHUNK - 1, range.e.r);
            const chunkSheet: XLSX.WorkSheet = {};

            for (let col = range.s.c; col <= endCol; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
                chunkSheet[cellAddress] = { v: headers[col - range.s.c], t: "s" };
            }

            let chunkRow = 1;
            for (let row = rowStart; row <= rowEnd; row++) {
                for (let col = range.s.c; col <= endCol; col++) {
                    const originalAddress = XLSX.utils.encode_cell({ r: row, c: col });
                    const chunkAddress = XLSX.utils.encode_cell({ r: chunkRow, c: col });
                    if (sheet[originalAddress]) {
                        chunkSheet[chunkAddress] = sheet[originalAddress];
                    }
                }
                chunkRow++;
            }

            chunkSheet["!ref"] = XLSX.utils.encode_range({
                s: { r: 0, c: range.s.c },
                e: { r: chunkRow - 1, c: endCol },
            });

            const csv = XLSX.utils.sheet_to_csv(chunkSheet);
            if (csv.trim()) {
                const rowRange = `rows ${rowStart - startRow}-${rowEnd - startRow}`;
                chunks.push({
                    title: `${sheetName} (chunk ${chunkIndex + 1}, ${rowRange})`,
                    content: csv.trim(),
                });
                chunkIndex++;
            }
        }

        return chunks;
    }
}
