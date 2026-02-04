import Identifier from "../valueObjects/Identifier";
import DateTimeValue from "../valueObjects/DateTimeValue";
import MessageRole from "../valueObjects/MessageRole";

// Entities
import Source from "./source";
import MediaContent from "./mediaContent";

export default class Message {
    private id: Identifier | null;
    private chatId: Identifier;
    private role: MessageRole;
    private content: string;
    private mediaContentId: Identifier | null;
    private timestamp: DateTimeValue;
    private metadata: Record<string, unknown> | null;

    private mediaContent: MediaContent | null = null;
    private sources: Source[] = [];

    constructor(
        id: Identifier | null,
        chatId: Identifier,
        role: MessageRole,
        content: string,
        mediaContentId: Identifier | null,
        timestamp: DateTimeValue,
        metadata: Record<string, unknown> | null
    ) {
        this.id = id;
        this.chatId = chatId;
        this.role = role;
        this.content = content;
        this.mediaContentId = mediaContentId;
        this.timestamp = timestamp;
        this.metadata = metadata;
    }

    // Getters
    public getId(): Identifier | null {
        return this.id;
    }

    public getChatId(): Identifier {
        return this.chatId;
    }

    public getRole(): MessageRole {
        return this.role;
    }

    public getContent(): string {
        return this.content;
    }

    public getMediaContentId(): Identifier | null {
        return this.mediaContentId;
    }

    public getTimestamp(): DateTimeValue {
        return this.timestamp;
    }

    public getMetadata(): Record<string, unknown> | null {
        return this.metadata;
    }

    public getMediaContent(): MediaContent | null {
        return this.mediaContent;
    }

    public getSources(): Source[] {
        return this.sources;
    }

    // Setters
    public setId(id: Identifier | null): void {
        this.id = id;
    }

    public setChatId(chatId: Identifier): void {
        this.chatId = chatId;
    }

    public setRole(role: MessageRole): void {
        this.role = role;
    }

    public setContent(content: string): void {
        this.content = content;
    }

    public setMediaContentId(mediaContentId: Identifier | null): void {
        this.mediaContentId = mediaContentId;
    }

    public setTimestamp(timestamp: DateTimeValue): void {
        this.timestamp = timestamp;
    }

    public setMetadata(metadata: Record<string, unknown> | null): void {
        this.metadata = metadata;
    }

    public setMediaContent(mediaContent: MediaContent): void {
        this.mediaContent = mediaContent;
    }

    public setSources(sources: Source[]): void {
        this.sources = sources;
    }

    public addSource(source: Source): void {
        this.sources.push(source);
    }
}

