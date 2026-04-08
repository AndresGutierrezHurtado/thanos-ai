import { Request, Response } from "express";

import AuthUseCase, { EMAIL_NOT_VERIFIED } from "../../../application/useCases/AuthUseCase";
import RegisterDTO from "../../../application/ports/dtos/RegisterDTO";
import LoginDTO from "../../../application/ports/dtos/LoginDTO";
import VerifyEmailDTO from "../../../application/ports/dtos/VerifyEmailDTO";
import ForgotPasswordDTO from "../../../application/ports/dtos/ForgotPasswordDTO";
import ResetPasswordDTO from "../../../application/ports/dtos/ResetPasswordDTO";
import UpdateUserDTO from "../../../application/ports/dtos/UpdateUserDTO";

export default class AuthController {
    constructor(private readonly authUseCase: AuthUseCase) {}

    public async register(req: Request, res: Response): Promise<Response> {
        const { name, email, password } = req.body;
        const nameTrimmed = typeof name === "string" ? name.trim() : "";
        if (!nameTrimmed) {
            return res.status(400).json({
                success: false,
                message: "El nombre es obligatorio",
            });
        }
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email y contraseña son obligatorios",
            });
        }

        try {
            const dto: RegisterDTO = { name: nameTrimmed, email, password };
            const result = await this.authUseCase.register(dto);
            res.setHeader("Authorization", `Bearer ${result.token}`);
            return res.status(201).json({
                success: true,
                message: "User registered successfully",
                data: { user: result.user },
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Registration failed";
            if (
                message === "Email already registered" ||
                message === "Solo se permiten correos corporativos @plataforma.com.co" ||
                message.startsWith("Formato de email") ||
                message === "El email es obligatorio"
            ) {
                return res.status(400).json({ success: false, message });
            }
            throw err;
        }
    }

    public async login(req: Request, res: Response): Promise<Response> {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        try {
            const dto: LoginDTO = { email, password };
            const result = await this.authUseCase.login(dto);
            res.setHeader("Authorization", `${result.token}`);
            return res.status(200).json({
                success: true,
                message: "Login successful",
                data: { user: result.user },
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Login failed";
            if (message === "El correo o contraseña están incorrectos.") {
                return res.status(401).json({ success: false, message });
            }
            if (message === EMAIL_NOT_VERIFIED) {
                return res.status(403).json({
                    success: false,
                    code: "EMAIL_NOT_VERIFIED",
                    message: "Debes validar tu correo. Revisa tu bandeja de entrada para el código OTP.",
                });
            }
            throw err;
        }
    }

    public async verifyEmail(req: Request, res: Response): Promise<Response> {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: "Email y código son obligatorios",
            });
        }
        try {
            const dto: VerifyEmailDTO = { email: String(email).trim(), code: String(code).trim() };
            const result = await this.authUseCase.verifyEmail(dto.email, dto.code);
            res.setHeader("Authorization", `Bearer ${result.token}`);
            return res.status(200).json({
                success: true,
                message: "Correo verificado. Ya puedes iniciar sesión.",
                data: { user: result.user },
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Error al verificar";
            if (message === "Código inválido o expirado") {
                return res.status(400).json({ success: false, message });
            }
            throw err;
        }
    }

    public async forgotPassword(req: Request, res: Response): Promise<Response> {
        const { email } = req.body;
        if (!email || !String(email).trim()) {
            return res.status(400).json({
                success: false,
                message: "El email es obligatorio",
            });
        }
        try {
            const dto: ForgotPasswordDTO = { email: String(email).trim().toLowerCase() };
            await this.authUseCase.requestPasswordReset(dto);
            return res.status(200).json({
                success: true,
                message: "Si el correo existe en el sistema, recibirás un código para restablecer tu contraseña.",
            });
        } catch (err) {
            throw err;
        }
    }

    public async resetPassword(req: Request, res: Response): Promise<Response> {
        const { email, code, newPassword, confirmPassword } = req.body;
        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: "Email y código son obligatorios",
            });
        }
        if (!newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "La nueva contraseña y la confirmación son obligatorias",
            });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Las contraseñas no coinciden",
            });
        }
        try {
            const dto: ResetPasswordDTO = {
                email: String(email).trim().toLowerCase(),
                code: String(code).trim(),
                newPassword: String(newPassword),
                confirmPassword: String(confirmPassword),
            };
            await this.authUseCase.resetPassword(dto);
            return res.status(200).json({
                success: true,
                message: "Contraseña actualizada. Ya puedes iniciar sesión.",
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Error al restablecer";
            if (message === "Código inválido o expirado" || message === "Las contraseñas no coinciden") {
                return res.status(400).json({ success: false, message });
            }
            throw err;
        }
    }

    public async update(req: Request, res: Response): Promise<Response> {
        const userId = (res.locals as { userId?: string }).userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "No autorizado",
            });
        }
        const { name, systemPrompt } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "El nombre es obligatorio",
            });
        }
        try {
            const dto: UpdateUserDTO = {
                userId,
                name: String(name).trim(),
                systemPrompt: systemPrompt ? String(systemPrompt).trim() : "",
            };
            const result = await this.authUseCase.update(dto);
            return res.status(200).json({
                success: true,
                message: "Usuario actualizado exitosamente",
                data: { user: result.user },
            });
        } catch (err) {
            throw err;
        }
    }
}
