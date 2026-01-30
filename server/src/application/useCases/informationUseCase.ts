import IDriveProvider from "../ports/provider/IDriveProvider";
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

    public async syncDocuments(): Promise<{ processed: number; skipped: number }> {
        const files = await this.driveProvider.listFiles();
        let processed = 0;
        let skipped = 0;

        for (const file of files) {
            try {
                const exists = await this.documentRepository.findByDriveId(
                    file.id
                );
                const checksum = file.md5Checksum ?? file.modifiedTime;

                if (exists && exists.checksum === checksum) {
                    skipped++;
                    continue;
                }

                const buffer = await this.driveProvider.downloadFile(file.id);
                const processor = this.processorFactory.get(file.mimeType);
                const extracted = await processor.extract(buffer);

                const sourceType = resolveFileType(file.mimeType);
                const chunks = this.chunker.createChunks(extracted, {
                    driveId: file.id,
                    version: file.modifiedTime,
                    sourceType,
                });

                if (chunks.length === 0) {
                    skipped++;
                    continue;
                }

                await this.vectorStore.deleteByDriveId(
                    DOCUMENTS_COLLECTION,
                    file.id
                );

                await this.documentRepository.save({
                    driveId: file.id,
                    title: file.name,
                    mimeType: file.mimeType,
                    version: file.modifiedTime,
                    checksum,
                });

                await this.vectorStore.addDocuments(
                    DOCUMENTS_COLLECTION,
                    chunks.map((c: ChunkData) => ({
                        id: c.id,
                        content: c.content,
                        metadata: c.metadata,
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
