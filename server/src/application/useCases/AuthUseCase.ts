import User from "../../domain/entities/user";
import DateTimeValue from "../../domain/valueObjects/DateTimeValue";
import Email from "../../domain/valueObjects/Email";
import Identifier from "../../domain/valueObjects/Identifier";
import IUserRepository from "../ports/repositories/IUserRepository";
import IPasswordHasher from "../ports/services/IPasswordHasher";
import ITokenProvider from "../ports/services/ITokenProvider";
import IEmailSender from "../ports/services/IEmailSender";
import RegisterDTO from "../ports/dtos/RegisterDTO";
import LoginDTO from "../ports/dtos/LoginDTO";
import ForgotPasswordDTO from "../ports/dtos/ForgotPasswordDTO";
import ResetPasswordDTO from "../ports/dtos/ResetPasswordDTO";
import UpdateUserDTO from "../ports/dtos/UpdateUserDTO";
import { UserResource, toUserResource } from "../ports/resources/UserResource";

export const EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED";
const OTP_EXPIRY_MINUTES = 10;
const OTP_LENGTH = 6;

function generateOtp(): string {
    const min = 10 ** (OTP_LENGTH - 1);
    const max = 10 ** OTP_LENGTH - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
}

export interface AuthResult {
    user: UserResource;
    token: string;
}

export default class AuthUseCase {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly passwordHasher: IPasswordHasher,
        private readonly tokenProvider: ITokenProvider,
        private readonly emailSender: IEmailSender,
    ) {}

    public async register(dto: RegisterDTO): Promise<AuthResult> {
        const email = new Email(dto.email);
        if (!email.isCorporate()) {
            throw new Error("Solo se permiten correos corporativos @plataforma.com.co");
        }

        const existing = await this.userRepository.findByEmail(email.getValue());
        if (existing) {
            throw new Error("Email already registered");
        }

        const passwordHash = await this.passwordHasher.hash(dto.password);
        const now = new DateTimeValue();
        const name = (dto.name ?? "").trim() || "";
        const user = await this.userRepository.create(
            new User(null, email, name, passwordHash, false, null, null, now, now),
        );

        const id = user.getId();
        if (!id) throw new Error("User must have id");
        const token = this.tokenProvider.sign(id.getValue(), user.getEmail().getValue());
        return { user: toUserResource(user), token };
    }

    public async login(dto: LoginDTO): Promise<AuthResult> {
        const user = await this.userRepository.findByEmail(dto.email);
        if (!user) {
            throw new Error("El correo o contraseña están incorrectos.");
        }

        const valid = await this.passwordHasher.compare(dto.password, user.getPasswordHash());
        if (!valid) {
            throw new Error("El correo o contraseña están incorrectos.");
        }

        if (!user.getValidatedEmail()) {
            const code = generateOtp();
            const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
            user.setOtpCode(code);
            user.setOtpExpiresAt(expiresAt);
            user.setUpdatedAt(new DateTimeValue());
            await this.userRepository.update(user);
            await this.emailSender.sendVerificationCode(user.getEmail().getValue(), code);
            throw new Error(EMAIL_NOT_VERIFIED);
        }

        const id = user.getId();
        if (!id) throw new Error("User must have id");
        const token = this.tokenProvider.sign(id.getValue(), user.getEmail().getValue());
        return { user: toUserResource(user), token };
    }

    public async verifyEmail(email: string, code: string): Promise<AuthResult> {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new Error("Código inválido o expirado");
        }
        const storedCode = user.getOtpCode();
        const expiresAt = user.getOtpExpiresAt();
        if (!storedCode || !expiresAt || expiresAt < new Date() || storedCode !== code.trim()) {
            throw new Error("Código inválido o expirado");
        }
        user.setValidatedEmail(true);
        user.setOtpCode(null);
        user.setOtpExpiresAt(null);
        user.setUpdatedAt(new DateTimeValue());
        await this.userRepository.update(user);

        const id = user.getId();
        if (!id) throw new Error("User must have id");
        const token = this.tokenProvider.sign(id.getValue(), user.getEmail().getValue());
        return { user: toUserResource(user), token };
    }

    public async requestPasswordReset(dto: ForgotPasswordDTO): Promise<void> {
        const user = await this.userRepository.findByEmail(dto.email.trim().toLowerCase());
        if (!user) return;
        const code = generateOtp();
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        user.setOtpCode(code);
        user.setOtpExpiresAt(expiresAt);
        user.setUpdatedAt(new DateTimeValue());
        await this.userRepository.update(user);
        await this.emailSender.sendVerificationCode(user.getEmail().getValue(), code);
    }

    public async resetPassword(dto: ResetPasswordDTO): Promise<void> {
        if (dto.newPassword !== dto.confirmPassword) {
            throw new Error("Las contraseñas no coinciden");
        }
        const user = await this.userRepository.findByEmail(dto.email.trim().toLowerCase());
        if (!user) {
            throw new Error("Código inválido o expirado");
        }
        const storedCode = user.getOtpCode();
        const expiresAt = user.getOtpExpiresAt();
        if (!storedCode || !expiresAt || expiresAt < new Date() || storedCode !== dto.code.trim()) {
            throw new Error("Código inválido o expirado");
        }
        const passwordHash = await this.passwordHasher.hash(dto.newPassword);
        user.setPasswordHash(passwordHash);
        user.setOtpCode(null);
        user.setOtpExpiresAt(null);
        user.setUpdatedAt(new DateTimeValue());
        await this.userRepository.update(user);
    }

    public async update(dto: UpdateUserDTO): Promise<{ user: UserResource }> {
        const id = new Identifier(dto.userId);
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new Error("Usuario no encontrado");
        }

        user.setName(dto.name);
        user.setSystemPrompt(dto.systemPrompt);
        user.setUpdatedAt(new DateTimeValue());

        await this.userRepository.update(user);

        return { user: toUserResource(user) };
    }
}
