import Identifier from "../valueObjects/Identifier";
import DateTimeValue from "../valueObjects/DateTimeValue";

// Entities
import Message from "./message";

export default class Chat {
    private id: Identifier | null;
    private userId: Identifier | null;
    private title: string;
    private createdAt: DateTimeValue;
    private updatedAt: DateTimeValue;

    private messages: Message[] = [];

    constructor(id: Identifier | null, userId: Identifier | null, title: string, createdAt: DateTimeValue, updatedAt: DateTimeValue) {
        this.id = id;
        this.userId = userId;
        this.title = title;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Getters
    public getId(): Identifier | null {
        return this.id;
    }

    public getMessages(): Message[] {
        return this.messages;
    }

    public getUserId(): Identifier | null {
        return this.userId;
    }

    public getTitle(): string {
        return this.title;
    }
    
    public getCreatedAt(): DateTimeValue {
        return this.createdAt;
    }

    public getUpdatedAt(): DateTimeValue {
        return this.updatedAt;
    }

    // Setters
    public setId(id: Identifier | null): void {
        this.id = id;
    }

    public setUserId(userId: Identifier | null): void {
        this.userId = userId;
    }

    public setTitle(title: string): void {
        this.title = title;
    }

    public setCreatedAt(createdAt: DateTimeValue): void {
        this.createdAt = createdAt;
    }

    public setUpdatedAt(updatedAt: DateTimeValue): void {
        this.updatedAt = updatedAt;
    }

    public setMessages(messages: Message[]): void {
        this.messages = messages;
    }

    public addMessage(message: Message): void {
        this.messages.push(message);
    }
}