import IChunker, { ChunkData, ChunkMetadata } from "../../application/ports/services/IChunker";
import { ExtractedDocument } from "../../application/ports/services/IDocumentProcessor";

// Words per chunk: smaller chunks keep each embedding about one topic
const CHUNK_SIZE = 350;
const CHUNK_OVERLAP = 0.15;
// Characters per chunk at most, whatever its words: keeps it (plus its context header) well
// under the embedding model's input limit (8192 tokens) even for text with few spaces
const MAX_CHUNK_CHARS = 8000;

export default class HierarchicalChunker implements IChunker {
    createChunks(
        extracted: ExtractedDocument,
        context: ChunkMetadata
    ): ChunkData[] {
        const chunks: ChunkData[] = [];
        const { driveId, documentVersion, sourceType, path, location, name } = context;

        const sections =
            (extracted.sections?.length ?? 0) > 0
                ? extracted.sections!
                : [{ title: "Content", content: extracted.text }];

        for (const section of sections) {
            const sectionChunks = this.chunkBySize(section.content, CHUNK_SIZE, CHUNK_OVERLAP);
            const header = [
                `Documento: ${name}`,
                location && `Ubicación: ${location}`,
                section.title !== "Content" && `Sección: ${section.title}`,
            ]
                .filter(Boolean)
                .join(" | ");

            for (let i = 0; i < sectionChunks.length; i++) {
                const chunkId = this.buildChunkId(driveId, section.title, i, documentVersion);
                chunks.push({
                    id: chunkId,
                    content: sectionChunks[i],
                    context: header,
                    metadata: {
                        driveId,
                        name,
                        documentVersion,
                        section: section.title,
                        sourceType,
                        path,
                        location,
                        chunkIndex: chunks.length,
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
            const chunk = words.slice(i, i + maxTokens).join(" ");
            for (let start = 0; start < chunk.length; start += MAX_CHUNK_CHARS) {
                chunks.push(chunk.slice(start, start + MAX_CHUNK_CHARS));
            }
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
