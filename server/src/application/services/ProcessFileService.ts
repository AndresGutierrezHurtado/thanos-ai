import ILogger, { SyslogSeverity } from "../ports/services/ILogger";
import IDriveProvider, { DriveFile } from "../ports/services/IDriveProvider";
import IDocumentRepository from "../ports/repositories/IDocumentRepository";
import ProcessorFactory from "../../infrastructure/services/ProcessorFactory";
import IChunker, { ChunkData } from "../ports/services/IChunker";
import IVectorStore from "../ports/services/IVectorStore";
import ITransactionRepository from "../ports/repositories/ITransactionRepository";
import resolveFileType from "../utils/resolveFileType";

export default class ProcessFileService {
    constructor(
        private readonly driveProvider: IDriveProvider,
        private readonly documentRepository: IDocumentRepository,
        private readonly processorFactory: ProcessorFactory,
        private readonly chunker: IChunker,
        private readonly vectorStore: IVectorStore,
        private readonly transactionRepository: ITransactionRepository,
        private readonly logger: ILogger,
    ) {}

    public async execute(file: DriveFile): Promise<Boolean> {
        await this.transactionRepository.begin();

        try {
            // CHECK IF FILE ALREADY EXISTS
            const exists = await this.documentRepository.findByDriveId(file.id);
            const checksum = file.md5Checksum ?? file.modifiedTime;

            if (exists && exists.getChecksum() === (checksum as string)) {
                return false;
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
                return false;
            }

            // DELETING EXISTING DOCUMENTS FROM THE VECTOR STORE
            await this.vectorStore.deleteByDriveId("iso-docs", file.id);

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
                "iso-docs",
                chunks.map((chunk: ChunkData) => ({
                    id: chunk.id,
                    content: chunk.content,
                    metadata: chunk.metadata,
                })),
            );

            // COMMITTING THE TRANSACTION
            await this.transactionRepository.commit();

            return true;
        } catch (err: unknown) {
            await this.transactionRepository.rollback();
            this.logger.log(
                SyslogSeverity.ERROR,
                `[InformationUseCase:processFile] Error processing ${file.name} (${file.id}):`,
                { error: err as Error },
            );
            return false;
        }
    }
}
