import { ExtractedDocument } from "./IDocumentProcessor";

export interface ChunkMetadata {
    driveId: string;
    name: string;
    documentVersion: string;
    section: string;
    sourceType: string;
    path?: string;
    area?: string;
    type?: string;
    code?: string | null;
}

export interface ChunkData {
    id: string;
    content: string;
    metadata: ChunkMetadata;
}

export default interface IChunker {
    createChunks(
        extracted: ExtractedDocument,
        context: ChunkMetadata
    ): ChunkData[];
}
