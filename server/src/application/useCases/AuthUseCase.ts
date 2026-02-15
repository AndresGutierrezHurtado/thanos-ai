import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from "../../domain/entities/user";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";
import IUserRepository from "../ports/repositories/IUserRepository";
import RegisterDTO from "../ports/dtos/RegisterDTO";
import LoginDTO from "../ports/dtos/LoginDTO";
import { UserResource, toUserResource } from "../ports/resources/UserResource";

const SALT_ROUNDS = 10;

export interface AuthResult {
    user: UserResource;
    token: string;
}

export default class AuthUseCase {
    constructor(private readonly userRepository: IUserRepository) {}

    public async register(dto: RegisterDTO): Promise<AuthResult> {
        const existing = await this.userRepository.findByEmail(dto.email);
        if (existing) {
            throw new Error("Email already registered");
        }

        const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
        const now = new DateTimeValue();
        const user = await this.userRepository.create(
            new User(null, dto.email.toLowerCase(), passwordHash, now, now),
        );

        const token = this.createToken(user);
        return { user: toUserResource(user), token };
    }

    public async login(dto: LoginDTO): Promise<AuthResult> {
        const user = await this.userRepository.findByEmail(dto.email);
        if (!user) {
            throw new Error("Invalid email or password");
        }

        const valid = await bcrypt.compare(dto.password, user.getPasswordHash());
        if (!valid) {
            throw new Error("Invalid email or password");
        }

        const token = this.createToken(user);
        return { user: toUserResource(user), token };
    }

    private createToken(user: User): string {
        const secret = process.env.JWT_SECRET ?? "default-secret-change-in-production";
        const id = user.getId();
        if (!id) throw new Error("User must have id to create token");
        return jwt.sign(
            { userId: id.getValue(), email: user.getEmail() },
            secret,
            { expiresIn: "7d" },
        );
    }
}
