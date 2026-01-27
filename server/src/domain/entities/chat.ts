import Identifier from "../valueObjects/Identifier";
import DateTimeValue from "../valueObjects/DateTimeValue";

export default class Chat {
    private id: Identifier;
    private userId: Identifier | null;
    private title: string;
    private createdAt: DateTimeValue;
    private updatedAt: DateTimeValue;

    constructor(id: Identifier, userId: Identifier | null, title: string, createdAt: DateTimeValue, updatedAt: DateTimeValue) {
        this.id = id;
        this.userId = userId;
        this.title = title;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Getters
    public getId(): Identifier {
        return this.id;
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
    public setId(id: Identifier): void {
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
}