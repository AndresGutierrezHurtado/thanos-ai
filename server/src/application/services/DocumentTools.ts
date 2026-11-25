// DOMAIN
import Document from "../../domain/entities/document";
import Source from "../../domain/entities/source";

// PORTS
import { ChatTool } from "../ports/services/IChatProvider";
import IVectorStore, { StoredChunk } from "../ports/services/IVectorStore";
import IDocumentRepository from "../ports/repositories/IDocumentRepository";

import { DOCUMENTS_COLLECTION } from "./ProcessFileService";

/** Characters one read_document call returns at most; the rest is read with `fromChunk`. */
const MAX_CHARS_PER_READ = 40_000;
// Chunks fetched to know a document's length; longer documents are read up to here
const MAX_DOCUMENT_CHUNKS = 1000;
// Documents a folder filter can narrow a content search to
const MAX_FOLDER_DOCUMENTS = 2000;
// Sources shown under an answer when nothing was read
const MAX_SEARCH_SOURCES = 6;
const FILE_TYPES = ["pdf", "docx", "xlsx", "text"];

export interface DocumentToolsOptions {
    /** Total characters of documents the assistant may read for one answer */
    readBudget: number;
    /** Progress for the user ("Leyendo X...") while the assistant works */
    onStatus?: (status: string) => void;
}

export interface DocumentReadResult {
    document: Document;
    text: string;
    /** Chunk to continue from, null when the whole document was read */
    nextChunk: number | null;
    totalChunks: number;
}

/**
 * The assistant's document tools, like a file explorer: list a folder, find documents by
 * name or folder, search their content, and read a document in full. One instance serves
 * one answer: it tracks what was read (the answer's sources) and the reading budget.
 */
export default class DocumentTools {
    private budget: number;
    private readonly read = new Map<string, Source>();
    private readonly found: Source[] = [];
    private readonly listed: Document[] = [];

    constructor(
        private readonly documentRepository: IDocumentRepository,
        private readonly vectorStore: IVectorStore,
        private readonly options: DocumentToolsOptions,
    ) {
        this.budget = options.readBudget;
    }

    tools(): ChatTool[] {
        return [this.listFolderTool(), this.findDocumentsTool(), this.searchDocumentsTool(), this.readDocumentTool()];
    }

    /** The documents read; when none was read, the best search results, or those listed. */
    sources(): Source[] {
        if (this.read.size > 0) return [...this.read.values()];
        if (this.found.length === 0) {
            return this.listed.slice(0, MAX_SEARCH_SOURCES).map((document) => toSource(document));
        }

        const seen = new Set<string>();
        return this.found.filter((source) => {
            const key = source.getDocument()?.getDriveId() ?? source.getChunkId();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, MAX_SEARCH_SOURCES);
    }

    /**
     * Reads a document from `fromChunk`, within the per-call cap and the remaining budget,
     * and records it as a source. null when the document is not indexed.
     */
    async readDocument(driveId: string, fromChunk = 0): Promise<DocumentReadResult | null> {
        const [document] = await this.documentRepository.findByDriveIds([driveId]);
        if (!document) return null;

        const chunks = await this.vectorStore.getByDriveId(DOCUMENTS_COLLECTION, driveId, MAX_DOCUMENT_CHUNKS);
        const limit = Math.min(MAX_CHARS_PER_READ, this.budget);

        const parts: string[] = [];
        let used = 0;
        let next = Math.max(0, fromChunk);
        while (next < chunks.length) {
            const content = chunks[next].content;
            // Always return at least one chunk, so reading makes progress
            if (parts.length > 0 && used + content.length > limit) break;
            parts.push(content);
            used += content.length;
            next++;
        }

        this.budget = Math.max(0, this.budget - used);
        this.recordRead(document, chunks[fromChunk]);

        return {
            document,
            text: parts.join("\n\n"),
            nextChunk: next < chunks.length ? next : null,
            totalChunks: chunks.length,
        };
    }

    /** Whether a document fits whole in the remaining budget (and one read). */
    async fitsWhole(driveId: string): Promise<boolean> {
        const chunks = await this.vectorStore.getByDriveId(DOCUMENTS_COLLECTION, driveId, MAX_DOCUMENT_CHUNKS);
        const size = chunks.reduce((total, chunk) => total + chunk.content.length, 0);
        return size <= Math.min(MAX_CHARS_PER_READ, this.budget / 2);
    }

    private listFolderTool(): ChatTool {
        return {
            name: "list_folder",
            description:
                "Lista el contenido de una carpeta: sus subcarpetas (con cuántos documentos tienen) y los documentos que están directamente en ella. " +
                "Sin folderId lista la raíz. Úsala para explorar cómo están organizados los documentos.",
            parameters: {
                type: "object",
                properties: {
                    folderId: { type: "string", description: "Id de la carpeta ([folder:ID]); vacío para la raíz" },
                },
            },
            execute: async (args) => {
                const folderId = cleanId(args.folderId, "folder") || null;
                const listing = await this.documentRepository.listFolder(folderId, 50);
                if (folderId && !listing.folder) return `No existe la carpeta ${folderId}.`;

                this.status(`Explorando ${listing.folder ? `"${listing.folder.name}"` : "carpetas"}`);

                const lines = [listing.folder ? `Carpeta: ${listing.folder.location} [folder:${listing.folder.id}]` : "Raíz"];
                lines.push(`Subcarpetas (${listing.folders.length}):`);
                for (const folder of listing.folders) {
                    lines.push(`- ${folder.name} [folder:${folder.id}] (${folder.documents} documentos)`);
                }
                lines.push(`Documentos directamente aquí (${listing.totalDocuments}):`);
                for (const document of listing.documents) lines.push(`- ${describe(document)}`);
                if (listing.totalDocuments > listing.documents.length) {
                    lines.push(`(${listing.totalDocuments - listing.documents.length} más: usa find_documents con este folderId para filtrarlos)`);
                }
                return lines.join("\n");
            },
        };
    }

    private findDocumentsTool(): ChatTool {
        return {
            name: "find_documents",
            description:
                "Busca documentos por su NOMBRE o el nombre de sus CARPETAS (no por su contenido). Ignora mayúsculas y tildes; deben aparecer todas las palabras. " +
                "Úsala para 'qué documentos hay de...', listar documentos de un tipo o área, o ubicar un documento por su nombre o código. " +
                "Usa palabras cortas y claves (ej. 'perfil cargo', 'talento humano'); si no hay resultados, prueba con menos palabras o sinónimos.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Palabras que deben estar en el nombre o las carpetas del documento" },
                    folderId: { type: "string", description: "Solo documentos dentro de esta carpeta (a cualquier profundidad)" },
                    limit: { type: "integer", minimum: 1, maximum: 50, description: "Máximo de documentos (por defecto 20)" },
                },
            },
            execute: async (args) => {
                const text = typeof args.query === "string" ? args.query : "";
                const folderId = cleanId(args.folderId, "folder") || undefined;
                const limit = clamp(args.limit, 1, 50, 20);
                this.status(`Buscando documentos${text ? `: "${text}"` : ""}`);

                const { items, total } = await this.documentRepository.find({ text, folderId, limit });
                if (total === 0) return "No hay documentos con esas palabras en su nombre o carpetas.";

                this.listed.push(...items);
                const lines = [`${total} documento(s)${total > items.length ? `, se muestran ${items.length}` : ""}:`];
                for (const document of items) lines.push(`- ${describe(document)}`);
                return lines.join("\n");
            },
        };
    }

    private searchDocumentsTool(): ChatTool {
        return {
            name: "search_documents",
            description:
                "Búsqueda semántica en el CONTENIDO de los documentos: devuelve los fragmentos más relacionados con la consulta (máximo 2 por documento). " +
                "Úsala para preguntas sobre qué dicen los documentos. Los fragmentos son parciales: si un documento parece útil, léelo con read_document. " +
                "Puedes limitarla a una carpeta, a ciertos documentos o a un tipo de archivo; si con filtros no hay resultados, repite sin ellos.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Qué buscar, en lenguaje natural y con palabras completas" },
                    folderId: { type: "string", description: "Solo documentos dentro de esta carpeta" },
                    documentIds: { type: "array", items: { type: "string" }, description: "Solo estos documentos ([doc:ID])" },
                    fileType: { type: "string", enum: FILE_TYPES, description: "Solo este tipo de archivo" },
                    limit: {
                        type: "integer",
                        minimum: 1,
                        maximum: 20,
                        description: "Fragmentos a devolver: 4-6 para una pregunta puntual, 10-20 para comparar o abarcar varios documentos (por defecto 6)",
                    },
                },
                required: ["query"],
            },
            execute: async (args) => {
                const query = String(args.query ?? "").trim();
                if (!query) return "Indica qué buscar en query.";
                const limit = clamp(args.limit, 1, 20, 6);
                const sourceType = FILE_TYPES.includes(String(args.fileType)) ? String(args.fileType) : undefined;
                this.status(`Buscando en el contenido: "${query}"`);

                let driveIds: string[] | undefined = Array.isArray(args.documentIds)
                    ? args.documentIds.map((id) => cleanId(id, "doc")).filter(Boolean)
                    : undefined;
                if (driveIds?.length === 0) driveIds = undefined;

                const folderId = cleanId(args.folderId, "folder");
                if (folderId) {
                    const { items } = await this.documentRepository.find({ folderId, limit: MAX_FOLDER_DOCUMENTS });
                    const inFolder = items.map((document) => document.getDriveId());
                    driveIds = driveIds ? driveIds.filter((id) => inFolder.includes(id)) : inFolder;
                }

                const results = await this.vectorStore.query(DOCUMENTS_COLLECTION, query, { limit, driveIds, sourceType });
                this.found.push(...results);
                if (results.length === 0) return "Sin resultados. Prueba otra consulta, quita los filtros o usa find_documents.";

                return results
                    .map((result) => {
                        const document = result.getDocument();
                        const title = document ? describe(document) : "(documento no disponible)";
                        return `### ${title}\n${result.getContent()}`;
                    })
                    .join("\n\n");
            },
        };
    }

    private readDocumentTool(): ChatTool {
        return {
            name: "read_document",
            description:
                "Lee el contenido completo de un documento, en orden. Úsala cuando un documento parece útil, para responder con toda su información y no solo con fragmentos. " +
                "Si es largo devuelve una parte e indica desde qué fragmento (fromChunk) continuar. Lee solo lo necesario: hay un presupuesto de lectura por respuesta.",
            parameters: {
                type: "object",
                properties: {
                    documentId: { type: "string", description: "Id del documento ([doc:ID])" },
                    fromChunk: { type: "integer", minimum: 0, description: "Fragmento desde el que continuar (por defecto 0)" },
                },
                required: ["documentId"],
            },
            execute: async (args) => {
                const driveId = cleanId(args.documentId, "doc");
                if (this.budget <= 0) {
                    return "Presupuesto de lectura agotado: responde con la información que ya tienes.";
                }

                const known = (await this.documentRepository.findByDriveIds([driveId]))[0];
                if (!known) return `No existe el documento ${driveId}.`;
                this.status(`Leyendo "${known.getTitle()}"`);

                const result = await this.readDocument(driveId, clamp(args.fromChunk, 0, MAX_DOCUMENT_CHUNKS, 0));
                if (!result || result.totalChunks === 0) return `El documento ${driveId} no tiene contenido indexado.`;

                return formatRead(result, clamp(args.fromChunk, 0, MAX_DOCUMENT_CHUNKS, 0));
            },
        };
    }

    private recordRead(document: Document, first: StoredChunk | undefined): void {
        if (this.read.has(document.getDriveId())) return;
        this.read.set(document.getDriveId(), toSource(document, first));
    }

    private status(text: string): void {
        this.options.onStatus?.(text);
    }
}

/** A document as an answer's source, previewing its first chunk when known. */
function toSource(document: Document, first?: StoredChunk): Source {
    const source = new Source(
        first?.id ?? document.getDriveId(),
        document.getId(),
        null,
        document.getVersion(),
        String(first?.metadata.sourceType ?? ""),
        String(first?.metadata.section ?? ""),
        first?.content.slice(0, 500) ?? "",
    );
    source.setDocument(document);
    return source;
}

/** A read as the assistant sees it: what document, which part, and how to continue. */
export function formatRead(result: DocumentReadResult, fromChunk: number): string {
    const end = result.nextChunk ?? result.totalChunks;
    const header =
        `Documento: ${describe(result.document)}\n` +
        `Fragmentos ${fromChunk + 1}-${end} de ${result.totalChunks}` +
        (result.nextChunk !== null
            ? ` (incompleto: continúa con read_document fromChunk=${result.nextChunk} si lo necesitas)`
            : " (completo)");
    return `${header}\n\n${result.text}`;
}

/** "Título [doc:ID] (en Carpeta > Subcarpeta)" */
export function describe(document: Document): string {
    const location = document.getLocation();
    return `${document.getTitle()} [doc:${document.getDriveId()}]${location ? ` (en ${location})` : ""}`;
}

/** Accepts "ID", "doc:ID" or "[doc:ID]" */
function cleanId(value: unknown, prefix: "doc" | "folder"): string {
    if (typeof value !== "string") return "";
    return value.trim().replace(/^\[|\]$/g, "").replace(new RegExp(`^${prefix}:`), "").trim();
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
    const number = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(number)));
}
