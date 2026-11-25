import IDriveProvider, { DriveFile, IWritableDriveProvider } from "../ports/services/IDriveProvider";
import IVectorStore, { StoredChunk } from "../ports/services/IVectorStore";
import IDocumentRepository, { FolderSummary } from "../ports/repositories/IDocumentRepository";
import Source from "../../domain/entities/source";
import Document, { DOCUMENT_SOURCES, DocumentSourceName } from "../../domain/entities/document";
import ProcessFileService, { DOCUMENTS_COLLECTION } from "../services/ProcessFileService";
import ILogger, { SyslogSeverity } from "../ports/services/ILogger";

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
    /** Files being indexed now (`elapsedMs` is filled in when the status is read) */
    current: { file: string; step: string; startedAt: Date; elapsedMs?: number }[];
    /** A file still indexing after this long fails and the sync moves on */
    fileTimeoutMs: number;
}

export interface SyncOptions {
    /** Files indexed at once: each is held whole in memory while it is processed */
    concurrentFiles: number;
    /** A file still indexing after this long fails ("Tiempo agotado") and its slot is freed */
    fileTimeoutMs: number;
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

/**
 * "processed": re-indexed from the source. "removed": the file no longer exists in its source
 * and was removed from the index. "busy": a sync or refresh of it is running. "not_found": no
 * such document (or its source is not configured). "not_refreshable": an uploaded file, whose
 * only version is the one already indexed.
 */
export type RefreshDocumentResult =
    | { status: "processed"; document: Document }
    | { status: "removed" }
    | { status: "busy" }
    | { status: "not_found" }
    | { status: "not_refreshable" };

interface SyncJob {
    status: SyncStatus;
    rerun: boolean;
    loggedPercentage: number;
    done: Promise<void>;
}

export default class InformationUseCase {
    // Sync state lives in this process: one run at most per source
    private readonly jobs = new Map<DocumentSourceName, SyncJob>();
    // Single-document refreshes in progress, by driveId
    private readonly refreshing = new Map<string, Promise<RefreshDocumentResult>>();

    constructor(
        private readonly driveSource: IDriveProvider | null,
        private readonly localSource: IWritableDriveProvider,
        private readonly documentRepository: IDocumentRepository,
        private readonly vectorStore: IVectorStore,
        private readonly processFileService: ProcessFileService,
        private readonly logger: ILogger,
        private readonly syncOptions: SyncOptions,
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
                    sync: job
                        ? {
                              ...job.status,
                              errors: [...job.status.errors],
                              current: job.status.current.map((entry) => ({
                                  ...entry,
                                  elapsedMs: Date.now() - entry.startedAt.getTime(),
                              })),
                          }
                        : null,
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

    /** Folders and documents matching what the user typed after "@" in the chat. */
    public async searchMentions(text: string): Promise<{ folders: FolderSummary[]; documents: Document[] }> {
        const [folders, documents] = await Promise.all([
            this.documentRepository.findFolders({ text, limit: 5 }),
            this.documentRepository.find({ text, limit: 8 }),
        ]);
        return { folders, documents: documents.items };
    }

    public async listChromaFiles(query: string): Promise<Source[]> {
        return await this.vectorStore.query(DOCUMENTS_COLLECTION, query, { limit: 10 });
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
            status: newStatus(source, this.syncOptions.fileTimeoutMs),
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

    /**
     * Re-indexes one document from the current version in its source. A document whose file
     * no longer exists there is removed from the index, as the next sync would do.
     */
    public async refreshDocument(driveId: string): Promise<RefreshDocumentResult> {
        const document = await this.documentRepository.findByDriveId(driveId);
        const provider = document ? this.findProvider(document.getSource()) : null;
        if (!document || !provider) return { status: "not_found" };
        if (document.getSource() === "local") return { status: "not_refreshable" };

        // A running sync may be indexing this same file: both would replace its chunks at once
        if (this.jobs.get(document.getSource())?.status.running || this.refreshing.has(driveId)) {
            return { status: "busy" };
        }

        const run = (async (): Promise<RefreshDocumentResult> => {
            const file = await provider.getFileById(driveId);
            if (!file || file.trashed) {
                await this.removeFromIndex(driveId);
                return { status: "removed" };
            }

            // Drive does not return paths for a single file: keep the stored folders, new name
            const path = file.path ?? renamedPath(document.getPath(), file.name);
            const folders = file.folders ?? document.getFolders();
            await this.processFileService.execute({ ...file, path, folders }, document.getSource(), provider, {
                force: true,
            });

            const updated = await this.documentRepository.findByDriveId(driveId);
            return { status: "processed", document: updated ?? document };
        })();

        this.refreshing.set(driveId, run);
        try {
            return await run;
        } finally {
            this.refreshing.delete(driveId);
        }
    }

    /** What the assistant has indexed for a document: its chunks, in document order. */
    public async getDocumentChunks(
        driveId: string,
        limit: number,
    ): Promise<{ document: Document; chunks: StoredChunk[]; truncated: boolean } | null> {
        const document = await this.documentRepository.findByDriveId(driveId);
        if (!document) return null;

        const chunks = await this.vectorStore.getByDriveId(DOCUMENTS_COLLECTION, driveId, limit + 1);
        return { document, chunks: chunks.slice(0, limit), truncated: chunks.length > limit };
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
                Object.assign(status, newStatus(status.source, this.syncOptions.fileTimeoutMs));

                const files = await provider.listFiles(limit);
                status.total = files.length;
                this.logger.log(SyslogSeverity.INFO, `[sync:${status.source}] ${files.length} files listed`);

                // Workers take the next file as soon as theirs ends: a slow file holds only
                // its own slot. syncFile never throws, so one failure stops nothing
                let next = 0;
                const worker = async () => {
                    while (next < files.length) {
                        await this.syncFile(job, provider, files[next++]);
                    }
                };
                const workers = Math.min(this.syncOptions.concurrentFiles, files.length);
                await Promise.all(Array.from({ length: workers }, worker));

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

        const current = { file: file.path ?? file.name, step: "Revisando", startedAt: new Date() };
        status.current.push(current);
        const controller = new AbortController();
        let timer: NodeJS.Timeout | undefined;

        try {
            // A refresh of this file started before the sync: let it finish, then compare checksums
            await this.refreshing.get(file.id)?.catch(() => {});

            // On timeout the file fails now and its slot is freed. The abort stops the work at
            // its next step (download, batch of embeddings, save) and removes what it added;
            // synchronous text extraction cannot be interrupted, it stops right after
            const timeout = new Promise<never>((_, reject) => {
                timer = setTimeout(() => {
                    const minutes = Math.round(this.syncOptions.fileTimeoutMs / 60_000);
                    const error = new Error(`Tiempo agotado (${minutes} min) en: ${current.step}`);
                    controller.abort(error);
                    reject(error);
                }, this.syncOptions.fileTimeoutMs);
            });
            const result = await Promise.race([
                this.processFileService.execute(file, status.source, provider, {
                    signal: controller.signal,
                    onStep: (step) => (current.step = step),
                }),
                timeout,
            ]);
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
        } finally {
            clearTimeout(timer);
            status.current.splice(status.current.indexOf(current), 1);
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

function newStatus(source: DocumentSourceName, fileTimeoutMs: number): SyncStatus {
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
        current: [],
        fileTimeoutMs,
    };
}

/** The stored path with its file name replaced ("a/b/old.pdf" + "new.pdf" = "a/b/new.pdf"). */
function renamedPath(storedPath: string | undefined, name: string): string {
    const folderEnd = storedPath?.lastIndexOf("/") ?? -1;
    return folderEnd >= 0 ? `${storedPath!.slice(0, folderEnd + 1)}${name}` : name;
}

function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}
