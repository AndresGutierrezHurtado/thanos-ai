import IDriveProvider, { DriveFile } from "../ports/provider/IDriveProvider";
import IDocumentRepository from "../ports/repositories/IDocumentRepository";
import ProcessorFactory from "../../infrastructure/services/ProcessorFactory";
import IVectorStore from "../ports/services/IVectorStore";
import IChunker, { ChunkData } from "../ports/services/IChunker";
import resolveFileType from "../utils/resolveFileType";
import { DOCUMENTS_COLLECTION } from "../constants/collections";
import ILogger, { SyslogSeverity } from "../ports/services/ILogger";
import ITransactionRepository from "../ports/repositories/ITransactionRepository";
import Source from "../../domain/entities/source";

export default class InformationUseCase {
    private readonly CONCURRENT_DOWNLOADS = 10;
    constructor(
        private readonly driveProvider: IDriveProvider,
        private readonly documentRepository: IDocumentRepository,
        private readonly processorFactory: ProcessorFactory,
        private readonly chunker: IChunker,
        private readonly vectorStore: IVectorStore,
        private readonly transactionRepository: ITransactionRepository,
        private readonly logger: ILogger
    ) {}

    public async listFiles(): Promise<DriveFile[]> {
        return await this.driveProvider.listFiles();
    }

    public async listChromaFiles(query: string): Promise<Source[]> {
        return await this.vectorStore.query(DOCUMENTS_COLLECTION, query, 10);
    }

    public async syncDocuments(): Promise<{ processed: number; skipped: number }> {
        this.logger.log(SyslogSeverity.DEBUG, "pulling files from drive...");
        const files = await this.driveProvider.listFiles();
        this.logger.log(SyslogSeverity.DEBUG, `pulled ${files.length} files from drive`);

        let processed = 0;
        let skipped = 0;

        for (let i = 0; i < files.length; i += this.CONCURRENT_DOWNLOADS) {
            const batch = files.slice(i, i + this.CONCURRENT_DOWNLOADS);
            await Promise.all(batch.map((file) => this.processFile(file, processed, skipped)));
        }

        return { processed, skipped };
    }

    public async processFile(file: DriveFile, processed: number, skipped: number): Promise<void> {
        await this.transactionRepository.begin();
        try {
            const exists = await this.documentRepository.findByDriveId(file.id);
            const checksum = file.md5Checksum ?? file.modifiedTime;

            if (exists && exists.getChecksum() === checksum as string) {
                skipped++;
                return;
            }

            this.logger.log(SyslogSeverity.DEBUG, `downloading file ${file.name}...`);
            const buffer = await this.driveProvider.downloadFile(file.id, file.mimeType);
            const processor = this.processorFactory.get(file.mimeType);
            const extracted = await processor.extract(buffer, file.mimeType);
            this.logger.log(SyslogSeverity.DEBUG, `information extracted from: ${file.name}`);

            const sourceType = resolveFileType(file.mimeType);
            const chunks = this.chunker.createChunks(extracted, {
                driveId: file.id,
                version: file.modifiedTime,
                sourceType,
                path: file.path,
            });

            this.logger.log(SyslogSeverity.DEBUG, `chunks created from: ${file.name} (${chunks.length} chunks)`);

            if (chunks.length === 0) {
                skipped++;
                return;
            }

            this.logger.log(SyslogSeverity.DEBUG, `deleting existing documents from: ${file.name}`);
            await this.vectorStore.deleteByDriveId(DOCUMENTS_COLLECTION, file.id);

            this.logger.log(SyslogSeverity.DEBUG, `saving document to database: ${file.name}`);
            await this.documentRepository.save({
                driveId: file.id,
                title: file.name,
                mimeType: file.mimeType,
                version: file.modifiedTime,
                checksum: checksum as string,
                normCode: null,
                path: file.path,
            });

            this.logger.log(SyslogSeverity.DEBUG, `adding documents to vector store: ${file.name}`);
            await this.vectorStore.addDocuments(
                DOCUMENTS_COLLECTION,
                chunks.map((chunk: ChunkData) => ({
                    id: chunk.id,
                    content: chunk.content,
                    metadata: chunk.metadata,
                }))
            );
            processed++;
            await this.transactionRepository.commit();
        } catch (err: unknown) {
            await this.transactionRepository.rollback();
            this.logger.log(SyslogSeverity.ERROR, `[InformationUseCase:processFile] Error processing ${file.name} (${file.id}):`, { error: err as Error });
        }
    }
}
