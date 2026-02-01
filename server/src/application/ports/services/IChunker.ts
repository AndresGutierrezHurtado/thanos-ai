import { ExtractedDocument } from "./IDocumentProcessor";

export interface ChunkData {
    id: string;
    content: string;
    metadata: {
        driveId: string;
        documentVersion: string;
        section: string;
        sourceType: string;
        norm?: string;
        path?: string;
    };
}

export default interface IChunker {
    createChunks(
        extracted: ExtractedDocument,
        context: { driveId: string; version: string; sourceType: string; norm?: string; path?: string }
    ): ChunkData[];
}
