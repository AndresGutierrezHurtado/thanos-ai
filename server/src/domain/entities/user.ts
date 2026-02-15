import Identifier from "../valueObjects/Identifier";
import DateTimeValue from "../valueObjects/DateTimeValue";

export default class User {
    private id: Identifier | null;
    private email: string;
    private passwordHash: string;
    private createdAt: DateTimeValue;
    private updatedAt: DateTimeValue;

    constructor(
        id: Identifier | null,
        email: string,
        passwordHash: string,
        createdAt: DateTimeValue,
        updatedAt: DateTimeValue,
    ) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public getId(): Identifier | null {
        return this.id;
    }

    public getEmail(): string {
        return this.email;
    }

    public getPasswordHash(): string {
        return this.passwordHash;
    }

    public getCreatedAt(): DateTimeValue {
        return this.createdAt;
    }

    public getUpdatedAt(): DateTimeValue {
        return this.updatedAt;
    }

    public setId(id: Identifier | null): void {
        this.id = id;
    }

    public setEmail(email: string): void {
        this.email = email;
    }

    public setPasswordHash(passwordHash: string): void {
        this.passwordHash = passwordHash;
    }

    public setCreatedAt(createdAt: DateTimeValue): void {
        this.createdAt = createdAt;
    }

    public setUpdatedAt(updatedAt: DateTimeValue): void {
        this.updatedAt = updatedAt;
    }
}
