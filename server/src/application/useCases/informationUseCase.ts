import IDriveProvider, { DriveFile } from "../ports/provider/IDriveProvider";
import IDocumentRepository from "../ports/repositories/IDocumentRepository";
import ProcessorFactory from "../../infrastructure/services/ProcessorFactory";
import IVectorStore from "../ports/services/IVectorStore";
import IChunker, { ChunkData } from "../ports/services/IChunker";
import resolveFileType from "../utils/resolveFileType";
import { DOCUMENTS_COLLECTION } from "../constants/collections";

export default class InformationUseCase {
    constructor(
        private readonly driveProvider: IDriveProvider,
        private readonly documentRepository: IDocumentRepository,
        private readonly processorFactory: ProcessorFactory,
        private readonly chunker: IChunker,
        private readonly vectorStore: IVectorStore
    ) {}

    public async listFiles(): Promise<DriveFile[]> {
        return await this.driveProvider.listFiles();
    }

    public async syncDocuments(): Promise<{ processed: number; skipped: number }> {
        console.log("pulling files from drive...");
        const files = await this.driveProvider.listFiles();
        console.log(`pulled ${files.length} files from drive`);

        let processed = 0;
        let skipped = 0;

        for (const file of files) {
            try {
                const exists = await this.documentRepository.findByDriveId(file.id);
                const checksum = file.md5Checksum ?? file.modifiedTime;

                if (exists && exists.checksum === checksum) {
                    skipped++;
                    continue;
                }

                console.log(`downloading file ${file.name}...`);
                const buffer = await this.driveProvider.downloadFile(file.id, file.mimeType);
                const processor = this.processorFactory.get(file.mimeType);
                const extracted = await processor.extract(buffer, file.mimeType);
                console.log(`information extracted from: ${file.name}`);

                const sourceType = resolveFileType(file.mimeType);
                const chunks = this.chunker.createChunks(extracted, {
                    driveId: file.id,
                    version: file.modifiedTime,
                    sourceType,
                });

                console.log(`chunks created from: ${file.name} (${chunks.length} chunks)`);

                if (chunks.length === 0) {
                    skipped++;
                    continue;
                }

                console.log(`deleting existing documents from: ${file.name}`);
                await this.vectorStore.deleteByDriveId(DOCUMENTS_COLLECTION, file.id);

                console.log(`saving document to database: ${file.name}`);
                await this.documentRepository.save({
                    driveId: file.id,
                    title: file.name,
                    mimeType: file.mimeType,
                    version: file.modifiedTime,
                    checksum,
                });

                console.log(`adding documents to vector store: ${file.name}`);
                await this.vectorStore.addDocuments(
                    DOCUMENTS_COLLECTION,
                    chunks.map((chunk: ChunkData) => ({
                        id: chunk.id,
                        content: chunk.content,
                        metadata: chunk.metadata,
                    }))
                );
                processed++;
            } catch (err) {
                console.error(
                    `[InformationUseCase] Error processing ${file.name} (${file.id}):`,
                    err
                );
            }
        }

        return { processed, skipped };
    }
}
