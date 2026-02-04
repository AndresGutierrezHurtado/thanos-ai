import Identifier from "../valueObjects/Identifier";
import DateTimeValue from "../valueObjects/DateTimeValue";

export default class Document {
    private id: Identifier | null;
    private driveId: string;
    private title: string;
    private mimeType: string;
    private normCode: string | null;
    private version: string;
    private checksum: string;
    private processedAt: DateTimeValue;

    constructor(
        id: Identifier | null,
        driveId: string,
        title: string,
        mimeType: string,
        normCode: string | null,
        version: string,
        checksum: string,
        processedAt: DateTimeValue,
    ) {
        this.id = id;
        this.driveId = driveId;
        this.title = title;
        this.mimeType = mimeType;
        this.normCode = normCode;
        this.version = version;
        this.checksum = checksum;
        this.processedAt = processedAt;
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
}

