import IChunker, { ChunkData, ChunkMetadata } from "../../application/ports/services/IChunker";
import { ExtractedDocument } from "../../application/ports/services/IDocumentProcessor";

const CHUNK_SIZE = 600;
const CHUNK_OVERLAP = 0.15;

export default class HierarchicalChunker implements IChunker {
    createChunks(
        extracted: ExtractedDocument,
        context: ChunkMetadata
    ): ChunkData[] {
        const chunks: ChunkData[] = [];
        const { driveId, documentVersion, sourceType, path, area, type, code, name } = context;

        const sections =
            (extracted.sections?.length ?? 0) > 0
                ? extracted.sections!
                : [{ title: "Content", content: extracted.text }];

        for (const section of sections) {
            const sectionChunks = this.chunkBySize(section.content, CHUNK_SIZE, CHUNK_OVERLAP);
            for (let i = 0; i < sectionChunks.length; i++) {
                const chunkId = this.buildChunkId(driveId, section.title, i, documentVersion);
                chunks.push({
                    id: chunkId,
                    content: sectionChunks[i],
                    metadata: {
                        driveId,
                        name,
                        documentVersion,
                        section: section.title,
                        sourceType,
                        path,
                        area,
                        type,
                        code,
                    },
                });
            }
        }
        return chunks;
    }

    private chunkBySize(text: string, maxTokens: number, overlapRatio: number): string[] {
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length === 0) return [];
        const overlap = Math.floor(maxTokens * overlapRatio);
        const step = maxTokens - overlap;
        const chunks: string[] = [];
        for (let i = 0; i < words.length; i += step) {
            chunks.push(words.slice(i, i + maxTokens).join(" "));
        }
        return chunks;
    }

    private buildChunkId(
        driveId: string,
        section: string,
        chunkIndex: number,
        version: string
    ): string {
        const safeSection = section.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 50);
        const safeVersion = version.replace(/[^a-zA-Z0-9-_.]/g, "_");
        const uniqueId = Math.random().toString(36).substring(2, 15);
        return `${driveId}_${safeSection}_${chunkIndex}_${safeVersion}_${uniqueId}`;
    }
}
