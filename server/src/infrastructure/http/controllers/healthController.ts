import { Request, Response } from "express";

export default class HealthController {
    public async getHealthStatus(_req: Request, res: Response): Promise<Response> {
        return res.status(200).json({
            success: true,
            message: "Health check successful",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    }
}
