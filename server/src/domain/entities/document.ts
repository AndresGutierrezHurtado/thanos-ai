import Identifier from "../valueObjects/Identifier";
import DateTimeValue from "../valueObjects/DateTimeValue";

/** Where a document comes from: synced from Google Drive, or uploaded from the app. */
export type DocumentSourceName = "drive" | "local";
export const DOCUMENT_SOURCES: DocumentSourceName[] = ["drive", "local"];

/** A folder the document is in, from the source root down. Names may contain "/". */
export interface DocumentFolder {
    id: string;
    name: string;
}

export default class Document {
    private id: Identifier | null;
    private driveId: string;
    private title: string;
    private mimeType: string;
    private normCode: string | null;
    private version: string;
    private checksum: string;
    private processedAt: DateTimeValue;
    private path?: string;
    private source: DocumentSourceName;
    private folders: DocumentFolder[];
    private indexVersion: number;

    constructor(
        id: Identifier | null,
        driveId: string,
        title: string,
        mimeType: string,
        normCode: string | null,
        version: string,
        checksum: string,
        processedAt: DateTimeValue,
        path?: string,
        source: DocumentSourceName = "drive",
        folders: DocumentFolder[] = [],
        indexVersion = 0,
    ) {
        this.id = id;
        this.driveId = driveId;
        this.title = title;
        this.mimeType = mimeType;
        this.normCode = normCode;
        this.version = version;
        this.checksum = checksum;
        this.processedAt = processedAt;
        this.path = path;
        this.source = source;
        this.folders = folders;
        this.indexVersion = indexVersion;
    }

    // Getters
    public getId(): Identifier | null {
        return this.id;
    }

    public getDriveId(): string {
        return this.driveId;
    }

    public getTitle(): string {
        return this.title;
    }

    public getMimeType(): string {
        return this.mimeType;
    }

    public getNormCode(): string | null {
        return this.normCode;
    }

    public getVersion(): string {
        return this.version;
    }

    public getChecksum(): string {
        return this.checksum;
    }

    public getProcessedAt(): DateTimeValue {
        return this.processedAt;
    }

    public getPath(): string | undefined {
        return this.path;
    }

    public getSource(): DocumentSourceName {
        return this.source;
    }

    public getFolders(): DocumentFolder[] {
        return this.folders;
    }

    /** "Carpeta > Subcarpeta" (empty at the source root) */
    public getLocation(): string {
        return this.folders.map((folder) => folder.name).join(" > ");
    }

    /** Version of the indexing pipeline that produced its chunks (0: before versions existed) */
    public getIndexVersion(): number {
        return this.indexVersion;
    }

    // Setters
    public setId(id: Identifier | null): void {
        this.id = id;
    }

    public setDriveId(driveId: string): void {
        this.driveId = driveId;
    }

    public setTitle(title: string): void {
        this.title = title;
    }

    public setMimeType(mimeType: string): void {
        this.mimeType = mimeType;
    }

    public setNormCode(normCode: string | null): void {
        this.normCode = normCode;
    }

    public setVersion(version: string): void {
        this.version = version;
    }

    public setChecksum(checksum: string): void {
        this.checksum = checksum;
    }

    public setProcessedAt(processedAt: DateTimeValue): void {
        this.processedAt = processedAt;
    }

    public setPath(path: string): void {
        this.path = path;
    }
}
