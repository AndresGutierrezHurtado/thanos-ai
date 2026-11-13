import IDriveProvider, { DriveFile } from "../ports/services/IDriveProvider";
import IDocumentRepository from "../ports/repositories/IDocumentRepository";
import ProcessorFactory from "../../infrastructure/services/ProcessorFactory";
import IChunker, { ChunkData, ChunkMetadata } from "../ports/services/IChunker";
import IVectorStore from "../ports/services/IVectorStore";
import resolveFileType from "../../domain/services/resolveFileType";
import { DocumentSourceName } from "../../domain/entities/document";

export const DOCUMENTS_COLLECTION = "iso-docs";

/** "processed": (re)indexed now. "unchanged": already indexed with the same checksum. */
export type ProcessFileResult = "processed" | "unchanged";

export default class ProcessFileService {
    constructor(
        private readonly documentRepository: IDocumentRepository,
        private readonly processorFactory: ProcessorFactory,
        private readonly chunker: IChunker,
        private readonly vectorStore: IVectorStore,
    ) {}

    /** Indexes one file of a source. Throws when the file cannot be indexed. */
    public async execute(
        file: DriveFile,
        source: DocumentSourceName,
        provider: IDriveProvider,
    ): Promise<ProcessFileResult> {
        // CHECK IF FILE ALREADY EXISTS
        const exists = await this.documentRepository.findByDriveId(file.id);
        const checksum = file.md5Checksum ?? file.modifiedTime;

        if (exists && exists.getChecksum() === checksum) {
            return "unchanged";
        }

        // INFORMATION EXTRACTION FROM FILE
        const buffer = await provider.downloadFile(file.id, file.mimeType);
        const processor = this.processorFactory.get(file.mimeType);
        const extracted = await processor.extract(buffer, file.mimeType);
        const metadata: ChunkMetadata = this.extractMetadata(file, extracted.text);

        // CHUNKING THE DOCUMENT
        const chunks = this.chunker.createChunks(extracted, metadata);

        if (chunks.length === 0) {
            throw new Error("No se pudo extraer texto del archivo");
        }

        // DELETING EXISTING CHUNKS FROM THE VECTOR STORE
        await this.vectorStore.deleteByDriveId(DOCUMENTS_COLLECTION, file.id);

        try {
            // ADDING THE CHUNKS TO THE VECTOR STORE
            await this.vectorStore.addDocuments(
                DOCUMENTS_COLLECTION,
                chunks.map((chunk: ChunkData) => ({
                    id: chunk.id,
                    content: chunk.content,
                    metadata: metadata,
                })),
            );

            // SAVING THE DOCUMENT (AND ITS CHECKSUM) LAST: if indexing failed, the old
            // checksum is kept and the next sync retries this file instead of skipping it
            await this.documentRepository.save({
                driveId: metadata.driveId,
                title: metadata.name,
                mimeType: file.mimeType,
                version: metadata.documentVersion,
                checksum: checksum as string,
                normCode: metadata.code ?? null,
                path: metadata.path,
                source,
            });
        } catch (err: unknown) {
            // Only this file's chunks: other files are indexed concurrently
            await this.vectorStore.deleteByDriveId(DOCUMENTS_COLLECTION, file.id).catch(() => {});
            throw err;
        }

        return "processed";
    }

    private extractMetadata(file: DriveFile, content: string): ChunkMetadata {
        let area: string | null = null;
        let type: string | null = null;
        let code: string | null = null;

        // EXTRACTING FROM NAME
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        const nameMatch = cleanName.match(/^([A-Z]{1,3})-([A-Z]{1,3})-(\d+(?:-[A-Z]\d+)?)/);

        if (nameMatch) {
            const [, areaCode, typeCode, number] = nameMatch;
            const parts = (file.path ?? "").split("/").filter(Boolean);

            const typeMap: Record<string, string> = {
                PR: "Procedimiento",
                PO: "Política",
                RG: "Reglamento",
                CR: "Cartilla",
                PG: "Programa",
                F: "Formato",
                MT: "Matriz",
                OD: "Descripción y objetivos",
                CRT: "Caracterización del proceso",
                INS: "Instructivo",
                MN: "Manual",
                PL: "Plan",
                FT: "Ficha",
                AN: "Anexo",
                CIR: "Circular",
            };

            const areaMap: Record<string, string> = {
                G: "Gerencial / Información Empresarial",
                C: "Calidad",
                OPL: "Operaciones / Logística",
                INV: "Inventarios",
                MTO: "Ingeniería y mantenimiento",
                COM: "Compras",
                TH: "Talento Humano",
                RH: "Talento Humano",
                CF: "Contraloría y financiero",
                J: "Jurídico",
                CO: "Comercial",
                TI: "Tecnología de la información",
                IT: "Tecnología de la información",
                "I.T": "Tecnología de la información",
                AC: "Comunicaciones",
            };

            type = typeMap[typeCode] ?? typeCode;
            area = areaMap[areaCode] ?? parts[0] ?? areaCode ?? null;
            code = `${areaCode}-${typeCode}-${number}`;
        }

        // FINAL CLEANING
        area = area?.replace(/^\d+\.\s*/, "").trim() ?? null;
        type = type?.replace(/^\d+(\.\d+)*\.?\s*/, "").trim() ?? null;

        return {
            driveId: file.id,
            name: file.name,
            documentVersion: file.modifiedTime,
            section: "Content",
            sourceType: resolveFileType(file.mimeType),
            path: file.path,
            area,
            type,
            code,
        };
    }
}
