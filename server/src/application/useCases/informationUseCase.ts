import IDriveProvider, { DriveFile } from "../ports/services/IDriveProvider";
import IVectorStore from "../ports/services/IVectorStore";
import Source from "../../domain/entities/source";
import ProcessFileService from "../services/ProcessFileService";
import ILogger, { SyslogSeverity } from "../ports/services/ILogger";

export default class InformationUseCase {
    private readonly CONCURRENT_DOWNLOADS = 10;
    private filesLength = 0;
    private processed = 0;
    private skipped = 0;
    private percentage = 0;

    constructor(
        private readonly driveProvider: IDriveProvider,
        private readonly vectorStore: IVectorStore,
        private readonly processFileService: ProcessFileService,
        private readonly logger: ILogger,
    ) {}

    public async listFiles(): Promise<DriveFile[]> {
        return await this.driveProvider.listFiles();
    }

    public async listChromaFiles(query: string): Promise<Source[]> {
        return await this.vectorStore.query("iso-docs", query, 10);
    }

    public async downloadFileById(fileId: string): Promise<{ buffer: Buffer; filename: string; mimeType: string } | null> {
        const file = await this.driveProvider.getFileById(fileId);
        
        if (!file) {
            return null;
        }

        const googleNativeTypes: Record<string, string> = {
            "application/vnd.google-apps.document": "application/pdf",
            "application/vnd.google-apps.spreadsheet": "application/pdf",
            "application/vnd.google-apps.presentation": "application/pdf",
        };

        const finalMimeType = googleNativeTypes[file.mimeType] || file.mimeType;

        const buffer = await this.driveProvider.downloadFile(file.id, file.mimeType);
        
        return {
            buffer,
            filename: file.name,
            mimeType: finalMimeType,
        };
    }

    public async syncDocuments(): Promise<{ total: number }> {
        // GETTING FILES FROM A FILE PROVIDER
        const files = await this.driveProvider.listFiles();
        this.filesLength = files.length;

        // PROCESSING FILES IN BATCHES
        for (let i = 0; i < files.length; i += this.CONCURRENT_DOWNLOADS) {
            const batch = files.slice(i, i + this.CONCURRENT_DOWNLOADS);
            await Promise.all(batch.map((file) => this.processFile(file)));
        }

        // RETURNING THE RESULT
        return { total: this.filesLength };
    }

    private async processFile(file: DriveFile): Promise<Boolean> {
        // LOG THE PROGRESS
        const total = this.processed + this.skipped;
        const percentage = Math.round((total / this.filesLength) * 100);

        if (
            total === 0 ||
            total === this.filesLength ||
            (percentage !== this.percentage && percentage >= this.percentage + 5)
        ) {
            this.logger.log(
                SyslogSeverity.DEBUG,
                `processed ${percentage}% of files (${total} of ${this.filesLength})`,
            );
            this.percentage = percentage;
        }

        // PROCESS THE FILE
        const result = await this.processFileService.execute(file);

        if (result) {
            this.processed++;
        } else {
            this.skipped++;
        }

        // RETURN THE RESULT
        return result;
    }
}
