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
    private totalFiles = 0;
    private percentage = 0;
    private processed = 0;
    private skipped = 0;

    constructor(
        private readonly driveProvider: IDriveProvider,
        private readonly documentRepository: IDocumentRepository,
        private readonly processorFactory: ProcessorFactory,
        private readonly chunker: IChunker,
        private readonly vectorStore: IVectorStore,
        private readonly transactionRepository: ITransactionRepository,
        private readonly logger: ILogger,
    ) {}

    public async listFiles(): Promise<DriveFile[]> {
        return await this.driveProvider.listFiles();
    }

    public async listChromaFiles(query: string): Promise<Source[]> {
        return await this.vectorStore.query(DOCUMENTS_COLLECTION, query, 10);
    }

    public async syncDocuments(): Promise<{ processed: number; skipped: number }> {
        // GETTING FILES FROM A FILE PROVIDER
        const files = await this.driveProvider.listFiles();
        this.totalFiles = files.length;

        // PROCESSING FILES IN BATCHES
        for (let i = 0; i < files.length; i += this.CONCURRENT_DOWNLOADS) {
            const batch = files.slice(i, i + this.CONCURRENT_DOWNLOADS);
            await Promise.all(batch.map((file) => this.processFile(file)));
        }

        // RETURNING THE RESULT
        return { processed: this.processed, skipped: this.skipped };
    }

    public async processFile(file: DriveFile): Promise<void> {
        await this.transactionRepository.begin();
        const percentage = Math.round((this.processed / this.totalFiles) * 100);

        if (
            this.processed === 0 ||
            this.processed === this.totalFiles ||
            (percentage !== this.percentage && percentage >= this.percentage + 5)
        ) {
            this.logger.log(
                SyslogSeverity.DEBUG,
                `processed ${percentage}% of files (${this.processed} of ${this.totalFiles})`,
            );
            this.percentage = percentage;
        }

        try {
            // CHECK IF FILE ALREADY EXISTS
            const exists = await this.documentRepository.findByDriveId(file.id);
            const checksum = file.md5Checksum ?? file.modifiedTime;

            if (exists && exists.getChecksum() === (checksum as string)) {
                this.skipped++;
                return;
            }

            // INFORMATION EXTRACTION FROM FILE
            const buffer = await this.driveProvider.downloadFile(file.id, file.mimeType);
            const processor = this.processorFactory.get(file.mimeType);
            const extracted = await processor.extract(buffer, file.mimeType);

            // CHUNKING THE DOCUMENT
            const sourceType = resolveFileType(file.mimeType);
            const chunks = this.chunker.createChunks(extracted, {
                driveId: file.id,
                version: file.modifiedTime,
                sourceType,
                path: file.path,
            });

            if (chunks.length === 0) {
                this.skipped++;
                return;
            }

            // DELETING EXISTING DOCUMENTS FROM THE VECTOR STORE
            await this.vectorStore.deleteByDriveId(DOCUMENTS_COLLECTION, file.id);

            // SAVING THE DOCUMENT TO THE DATABASE
            await this.documentRepository.save({
                driveId: file.id,
                title: file.name,
                mimeType: file.mimeType,
                version: file.modifiedTime,
                checksum: checksum as string,
                normCode: null,
                path: file.path,
            });

            // ADDING THE DOCUMENTS TO THE VECTOR STORE
            await this.vectorStore.addDocuments(
                DOCUMENTS_COLLECTION,
                chunks.map((chunk: ChunkData) => ({
                    id: chunk.id,
                    content: chunk.content,
                    metadata: chunk.metadata,
                })),
            );

            this.processed++;

            // COMMITTING THE TRANSACTION
            await this.transactionRepository.commit();
        } catch (err: unknown) {
            await this.transactionRepository.rollback();
            this.logger.log(
                SyslogSeverity.ERROR,
                `[InformationUseCase:processFile] Error processing ${file.name} (${file.id}):`,
                { error: err as Error },
            );
        }
    }
}
