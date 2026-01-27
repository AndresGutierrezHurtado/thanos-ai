import Identifier from "../valueObjects/Identifier";
import MediaContentType from "../valueObjects/MediaContentType";

export default class MediaContent {
    private id: Identifier;
    private messageId: Identifier;
    private type: MediaContentType;
    private url: string;
    private filename: string;
    private mimeType: string;
    private size: number;

    constructor(
        id: Identifier,
        messageId: Identifier,
        type: MediaContentType,
        url: string,
        filename: string,
        mimeType: string,
        size: number
    ) {
        this.id = id;
        this.messageId = messageId;
        this.type = type;
        this.url = url;
        this.filename = filename;
        this.mimeType = mimeType;
        this.size = size;
    }

    // Getters
    public getId(): Identifier {
        return this.id;
    }

    public getMessageId(): Identifier {
        return this.messageId;
    }

    public getType(): MediaContentType {
        return this.type;
    }

    public getUrl(): string {
        return this.url;
    }

    public getFilename(): string {
        return this.filename;
    }

    public getMimeType(): string {
        return this.mimeType;
    }

    public getSize(): number {
        return this.size;
    }

    // Setters
    public setId(id: Identifier): void {
        this.id = id;
    }

    public setMessageId(messageId: Identifier): void {
        this.messageId = messageId;
    }

    public setType(type: MediaContentType): void {
        this.type = type;
    }

    public setUrl(url: string): void {
        this.url = url;
    }

    public setFilename(filename: string): void {
        this.filename = filename;
    }

    public setMimeType(mimeType: string): void {
        this.mimeType = mimeType;
    }

    public setSize(size: number): void {
        this.size = size;
    }
}

