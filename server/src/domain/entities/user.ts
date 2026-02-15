import Identifier from "../valueObjects/Identifier";
import DateTimeValue from "../valueObjects/DateTimeValue";
import Email from "../valueObjects/Email";

export default class User {
    private id: Identifier | null;
    private email: Email;
    private name: string;
    private passwordHash: string;
    private validatedEmail: boolean;
    private otpCode: string | null;
    private otpExpiresAt: Date | null;
    private createdAt: DateTimeValue;
    private updatedAt: DateTimeValue;

    constructor(
        id: Identifier | null,
        email: Email,
        name: string,
        passwordHash: string,
        validatedEmail: boolean,
        otpCode: string | null,
        otpExpiresAt: Date | null,
        createdAt: DateTimeValue,
        updatedAt: DateTimeValue,
    ) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.passwordHash = passwordHash;
        this.validatedEmail = validatedEmail;
        this.otpCode = otpCode;
        this.otpExpiresAt = otpExpiresAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public getId(): Identifier | null {
        return this.id;
    }

    public getEmail(): Email {
        return this.email;
    }

    public getName(): string {
        return this.name;
    }

    public getValidatedEmail(): boolean {
        return this.validatedEmail;
    }

    public getOtpCode(): string | null {
        return this.otpCode;
    }

    public getOtpExpiresAt(): Date | null {
        return this.otpExpiresAt;
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

    public setEmail(email: Email): void {
        this.email = email;
    }

    public setName(name: string): void {
        this.name = name;
    }

    public setPasswordHash(passwordHash: string): void {
        this.passwordHash = passwordHash;
    }

    public setValidatedEmail(validated: boolean): void {
        this.validatedEmail = validated;
    }

    public setOtpCode(code: string | null): void {
        this.otpCode = code;
    }

    public setOtpExpiresAt(expiresAt: Date | null): void {
        this.otpExpiresAt = expiresAt;
    }

    public setCreatedAt(createdAt: DateTimeValue): void {
        this.createdAt = createdAt;
    }

    public setUpdatedAt(updatedAt: DateTimeValue): void {
        this.updatedAt = updatedAt;
    }
}
