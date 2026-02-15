import { Request, Response } from "express";

import AuthUseCase from "../../../application/useCases/AuthUseCase";
import RegisterDTO from "../../../application/ports/dtos/RegisterDTO";
import LoginDTO from "../../../application/ports/dtos/LoginDTO";

export default class AuthController {
    constructor(private readonly authUseCase: AuthUseCase) {}

    public async register(req: Request, res: Response): Promise<Response> {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        try {
            const dto: RegisterDTO = { email, password };
            const result = await this.authUseCase.register(dto);
            return res.status(201).json({
                success: true,
                message: "User registered successfully",
                data: result,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Registration failed";
            if (message === "Email already registered") {
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
            return res.status(200).json({
                success: true,
                message: "Login successful",
                data: result,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Login failed";
            if (message === "Invalid email or password") {
                return res.status(401).json({ success: false, message });
            }
            throw err;
        }
    }
}
