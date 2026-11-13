import IDriveProvider, { DriveFile, IWritableDriveProvider } from "../ports/services/IDriveProvider";
import IVectorStore from "../ports/services/IVectorStore";
import IDocumentRepository from "../ports/repositories/IDocumentRepository";
import Source from "../../domain/entities/source";
import Document, { DOCUMENT_SOURCES, DocumentSourceName } from "../../domain/entities/document";
import ProcessFileService, { DOCUMENTS_COLLECTION } from "../services/ProcessFileService";
import ILogger, { SyslogSeverity } from "../ports/services/ILogger";

const CONCURRENT_FILES = 10;
const MAX_REPORTED_ERRORS = 100;

export interface SyncStatus {
    source: DocumentSourceName;
    running: boolean;
    total: number;
    processed: number;
    unchanged: number;
    failed: number;
    /** Documents removed from the index because they no longer exist in the source */
    removed: number;
    startedAt: Date;
    finishedAt: Date | null;
    /** Set when the whole run failed (e.g. the source could not be listed) */
    error: string | null;
    errors: { file: string; message: string }[];
}

export interface SourceOverview {
    source: DocumentSourceName;
    configured: boolean;
    documents: number;
    lastUpdatedAt: Date | null;
    /** Current or last sync since the server started */
    sync: SyncStatus | null;
}

export interface UploadedFile {
    path: string;
    content: Buffer;
}

/**
 * "started": a new run began. "queued": a run is in progress and will run once more when it
 * ends (it picks up files saved meanwhile). "running": a run is in progress, nothing queued.
 */
export type StartSyncResult = "started" | "queued" | "running";

interface SyncJob {
    status: SyncStatus;
    rerun: boolean;
    loggedPercentage: number;
    done: Promise<void>;
}

export default class InformationUseCase {
    // Sync state lives in this process: one run at most per source
    private readonly jobs = new Map<DocumentSourceName, SyncJob>();

    constructor(
        private readonly driveSource: IDriveProvider | null,
        private readonly localSource: IWritableDriveProvider,
        private readonly documentRepository: IDocumentRepository,
        private readonly vectorStore: IVectorStore,
        private readonly processFileService: ProcessFileService,
        private readonly logger: ILogger,
    ) {}

    public getConfiguredSources(): DocumentSourceName[] {
        return DOCUMENT_SOURCES.filter((source) => this.findProvider(source) !== null);
    }

    public async getSourcesOverview(): Promise<SourceOverview[]> {
        return Promise.all(
            DOCUMENT_SOURCES.map(async (source) => {
                const stats = await this.documentRepository.getSourceStats(source);
                const job = this.jobs.get(source);
                return {
                    source,
                    configured: this.findProvider(source) !== null,
                    documents: stats.count,
                    lastUpdatedAt: stats.lastUpdatedAt,
                    sync: job ? { ...job.status, errors: [...job.status.errors] } : null,
                };
            }),
        );
    }

    public async listDocuments(query: {
        source?: DocumentSourceName;
        search?: string;
        page: number;
        pageSize: number;
    }): Promise<{ items: Document[]; total: number }> {
        return this.documentRepository.list({
            source: query.source,
            search: query.search,
            skip: (query.page - 1) * query.pageSize,
            limit: query.pageSize,
        });
    }

    public async listChromaFiles(query: string): Promise<Source[]> {
        return await this.vectorStore.query(DOCUMENTS_COLLECTION, query, 10);
    }

    /** Starts syncing a source in the background. */
    public startSync(
        source: DocumentSourceName,
        options: { limit?: number; queueIfRunning?: boolean } = {},
    ): StartSyncResult {
        const provider = this.getProvider(source);
        const current = this.jobs.get(source);

        if (current?.status.running) {
            if (!options.queueIfRunning) return "running";
            current.rerun = true;
            return "queued";
        }

        const job: SyncJob = {
            status: newStatus(source),
            rerun: false,
            loggedPercentage: 0,
            done: Promise.resolve(),
        };
        this.jobs.set(source, job);
        job.done = this.runSync(job, provider, options.limit);
        return "started";
    }

    /** Syncs a source and waits for it to finish (CLI). */
    public async syncDocuments(source: DocumentSourceName, limit?: number): Promise<SyncStatus> {
        this.startSync(source, { limit, queueIfRunning: true });
        const job = this.jobs.get(source) as SyncJob;
        await job.done;
        return job.status;
    }

    /** Saves uploaded files to the local source and indexes them in the background. */
    public async uploadFiles(
        files: UploadedFile[],
    ): Promise<{ saved: number; rejected: { file: string; message: string }[] }> {
        let saved = 0;
        const rejected: { file: string; message: string }[] = [];

        for (const file of files) {
            try {
                await this.localSource.saveFile(file.path, file.content);
                saved++;
            } catch (err) {
                rejected.push({ file: file.path, message: errorMessage(err) });
            }
        }

        if (saved > 0) this.startSync("local", { queueIfRunning: true });
        return { saved, rejected };
    }

    /** Removes uploaded documents completely: stored file, chunks and document row. */
    public async deleteDocuments(
        driveIds: string[],
    ): Promise<{ deleted: number; rejected: { file: string; message: string }[] }> {
        let deleted = 0;
        const rejected: { file: string; message: string }[] = [];

        for (const driveId of driveIds) {
            const document = await this.documentRepository.findByDriveId(driveId);
            if (!document) continue;

            if (document.getSource() !== "local") {
                rejected.push({
                    file: document.getTitle(),
                    message: "Se elimina en Google Drive; la siguiente sincronización lo quita del índice",
                });
                continue;
            }

            try {
                // File first: if removing it from the index fails below, the row is kept and
                // deleting again (or the next sync) finishes the job
                await this.localSource.deleteFile(driveId);
                await this.removeFromIndex(driveId);
                deleted++;
            } catch (err) {
                rejected.push({ file: document.getTitle(), message: errorMessage(err) });
            }
        }

        return { deleted, rejected };
    }

    public async downloadFileById(
        driveId: string,
    ): Promise<{ buffer: Buffer; filename: string; mimeType: string } | null> {
        const document = await this.documentRepository.findByDriveId(driveId);
        const provider = document ? this.findProvider(document.getSource()) : null;
        const file = provider ? await provider.getFileById(driveId) : null;

        if (!provider || !file) {
            return null;
        }

        const googleNativeTypes: Record<string, string> = {
            "application/vnd.google-apps.document": "application/pdf",
            "application/vnd.google-apps.spreadsheet": "application/pdf",
            "application/vnd.google-apps.presentation": "application/pdf",
        };

        const finalMimeType = googleNativeTypes[file.mimeType] || file.mimeType;

        const buffer = await provider.downloadFile(file.id, file.mimeType);

        return {
            buffer,
            filename: file.name,
            mimeType: finalMimeType,
        };
    }

    private async runSync(job: SyncJob, provider: IDriveProvider, limit?: number): Promise<void> {
        const { status } = job;

        try {
            do {
                job.rerun = false;
                job.loggedPercentage = 0;
                Object.assign(status, newStatus(status.source));

                const files = await provider.listFiles(limit);
                status.total = files.length;
                this.logger.log(SyslogSeverity.INFO, `[sync:${status.source}] ${files.length} files listed`);

                for (let i = 0; i < files.length; i += CONCURRENT_FILES) {
                    const batch = files.slice(i, i + CONCURRENT_FILES);
                    await Promise.all(batch.map((file) => this.syncFile(job, provider, file)));
                }

                // A limited run only saw part of the source: pruning would delete the rest
                if (limit === undefined) {
                    status.removed = await this.pruneMissing(status.source, files);
                }
            } while (job.rerun);
        } catch (err) {
            status.error = errorMessage(err);
            this.logger.log(SyslogSeverity.ERROR, `[sync:${status.source}] failed: ${status.error}`, {
                error: err as Error,
            });
        } finally {
            status.running = false;
            status.finishedAt = new Date();
            this.logger.log(
                SyslogSeverity.INFO,
                `[sync:${status.source}] finished: ${status.processed} processed, ${status.unchanged} unchanged, ${status.failed} failed, ${status.removed} removed`,
            );
        }
    }

    private async syncFile(job: SyncJob, provider: IDriveProvider, file: DriveFile): Promise<void> {
        const { status } = job;

        try {
            const result = await this.processFileService.execute(file, status.source, provider);
            status[result]++;
        } catch (err) {
            status.failed++;
            if (status.errors.length < MAX_REPORTED_ERRORS) {
                status.errors.push({ file: file.path ?? file.name, message: errorMessage(err) });
            }
            this.logger.log(
                SyslogSeverity.ERROR,
                `[sync:${status.source}] error processing ${file.name} (${file.id}): ${errorMessage(err)}`,
                { error: err as Error },
            );
        }

        // LOG THE PROGRESS EVERY 5%
        const done = status.processed + status.unchanged + status.failed;
        const percentage = Math.round((done / status.total) * 100);
        if (done === status.total || percentage >= job.loggedPercentage + 5) {
            this.logger.log(
                SyslogSeverity.DEBUG,
                `[sync:${status.source}] processed ${percentage}% of files (${done} of ${status.total})`,
            );
            job.loggedPercentage = percentage;
        }
    }

    /** Removes from the index the documents of a source that were not listed. */
    private async pruneMissing(source: DocumentSourceName, files: DriveFile[]): Promise<number> {
        // An empty listing is far more likely a misconfiguration (wrong folder, lost access,
        // unmounted volume) than an emptied source: never wipe the index because of it
        if (files.length === 0) {
            this.logger.log(SyslogSeverity.WARNING, `[sync:${source}] no files listed, skipping removal of missing documents`);
            return 0;
        }

        const listed = new Set(files.map((file) => file.id));
        const indexed = await this.documentRepository.findDriveIdsBySource(source);
        const missing = indexed.filter((driveId) => !listed.has(driveId));

        for (const driveId of missing) {
            await this.removeFromIndex(driveId);
        }
        return missing.length;
    }

    private async removeFromIndex(driveId: string): Promise<void> {
        // Chunks first: if that fails the row stays, so the document can still be found and removed
        await this.vectorStore.deleteByDriveId(DOCUMENTS_COLLECTION, driveId);
        await this.documentRepository.deleteByDriveId(driveId);
    }

    private findProvider(source: DocumentSourceName): IDriveProvider | null {
        return source === "local" ? this.localSource : this.driveSource;
    }

    private getProvider(source: DocumentSourceName): IDriveProvider {
        const provider = this.findProvider(source);
        if (!provider) throw new Error(`Document source "${source}" is not configured`);
        return provider;
    }
}

function newStatus(source: DocumentSourceName): SyncStatus {
    return {
        source,
        running: true,
        total: 0,
        processed: 0,
        unchanged: 0,
        failed: 0,
        removed: 0,
        startedAt: new Date(),
        finishedAt: null,
        error: null,
        errors: [],
    };
}

function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}
