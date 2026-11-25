import { ExtractedDocument } from "./IDocumentProcessor";

export interface ChunkMetadata {
    driveId: string;
    name: string;
    documentVersion: string;
    section: string;
    sourceType: string;
    path?: string;
    /** "Carpeta > Subcarpeta" */
    location?: string;
    /** Position of the chunk in its document (missing on chunks indexed before it existed) */
    chunkIndex?: number;
}

export interface ChunkData {
    id: string;
    content: string;
    /** What the chunk is from (document, location, section): embedded with it, not stored in it */
    context: string;
    metadata: ChunkMetadata;
}

export default interface IChunker {
    createChunks(
        extracted: ExtractedDocument,
        context: ChunkMetadata
    ): ChunkData[];
}
