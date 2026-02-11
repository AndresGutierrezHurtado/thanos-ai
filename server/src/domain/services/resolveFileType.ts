export default function resolveFileType(mimeType: string): "pdf" | "docx" | "xlsx" | "image" | "text" {
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType.includes("word")) return "docx";
    if (mimeType.includes("spreadsheet")) return "xlsx";
    if (mimeType.startsWith("image/")) return "image";
    return "text";
}
