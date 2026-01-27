import { Request, Response } from "express";

export default class HealthController {
    public static async getHealth(req: Request, res: Response): Promise<Response> {
        return res.status(200).json({
            success: true,
            message: "Health check successful",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    }
}