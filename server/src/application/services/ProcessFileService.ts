import IDriveProvider, { DriveFile, DriveFolder } from "../ports/services/IDriveProvider";
import IDocumentRepository from "../ports/repositories/IDocumentRepository";
import ProcessorFactory from "../../infrastructure/services/ProcessorFactory";
import IChunker, { ChunkData, ChunkMetadata } from "../ports/services/IChunker";
import IVectorStore from "../ports/services/IVectorStore";
import resolveFileType from "../../domain/services/resolveFileType";
import { DocumentSourceName } from "../../domain/entities/document";

export const DOCUMENTS_COLLECTION = "iso-docs";

/**
 * Version of what indexing stores (metadata, chunking, embedded text). A sync re-indexes every
 * document indexed with an older version, so raise it whenever any of those change.
 * 2: folders and search text, chunk context embedded, 350-word chunks.
 */
export const INDEX_VERSION = 2;

/** "processed": (re)indexed now. "unchanged": already indexed with the same checksum. */
export type ProcessFileResult = "processed" | "unchanged";

export default class ProcessFileService {
    constructor(
        private readonly documentRepository: IDocumentRepository,
        private readonly processorFactory: ProcessorFactory,
        private readonly chunker: IChunker,
        private readonly vectorStore: IVectorStore,
    ) {}

    /**
     * Indexes one file of a source. Throws when the file cannot be indexed.
     * `force` re-indexes it even when its content and location did not change.
     */
    public async execute(
        file: DriveFile,
        source: DocumentSourceName,
        provider: IDriveProvider,
        options: { force?: boolean } = {},
    ): Promise<ProcessFileResult> {
        // CHECK IF FILE ALREADY EXISTS
        const exists = await this.documentRepository.findByDriveId(file.id);
        const checksum = file.md5Checksum ?? file.modifiedTime;

        // A renamed or moved file keeps its checksum, but its name, path and area (stored
        // with every chunk) changed. Rows saved before paths were recorded have none: comparing
        // those would re-index the whole source once
        const storedPath = exists?.getPath();
        const moved = storedPath !== undefined && storedPath !== file.path;

        const outdated = exists !== null && exists.getIndexVersion() < INDEX_VERSION;

        if (!options.force && exists && exists.getChecksum() === checksum && !moved && !outdated) {
            return "unchanged";
        }

        // INFORMATION EXTRACTION FROM FILE
        const buffer = await provider.downloadFile(file.id, file.mimeType);
        const processor = this.processorFactory.get(file.mimeType);
        const extracted = await processor.extract(buffer, file.mimeType);
        const folders = file.folders ?? [];
        const metadata: ChunkMetadata = this.extractMetadata(file, folders);

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
                    embeddingText: `${chunk.context}

${chunk.content}`,
                    // The chunk's own metadata: it carries its section and position
                    metadata: chunk.metadata,
                })),
            );

            // SAVING THE DOCUMENT (AND ITS CHECKSUM) LAST: if indexing failed, the old
            // checksum is kept and the next sync retries this file instead of skipping it
            await this.documentRepository.save({
                driveId: metadata.driveId,
                title: file.name,
                mimeType: file.mimeType,
                version: metadata.documentVersion,
                checksum: checksum as string,
                normCode: null,
                path: metadata.path,
                source,
                folders,
                indexVersion: INDEX_VERSION,
            });
        } catch (err: unknown) {
            // Only this file's chunks: other files are indexed concurrently
            await this.vectorStore.deleteByDriveId(DOCUMENTS_COLLECTION, file.id).catch(() => {});
            throw err;
        }

        return "processed";
    }

    private extractMetadata(file: DriveFile, folders: DriveFolder[]): ChunkMetadata {
        return {
            driveId: file.id,
            // Without extension: it adds nothing to the embedding
            name: file.name.replace(/\.[^/.]+$/, ""),
            documentVersion: file.modifiedTime,
            section: "Content",
            sourceType: resolveFileType(file.mimeType),
            path: file.path,
            location: folders.map((folder) => folder.name).join(" > ") || undefined,
        };
    }
}
