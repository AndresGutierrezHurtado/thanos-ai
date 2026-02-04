import { Request, Response } from "express";
import ILogger from "../../../application/ports/services/ILogger";

export default class HealthController {
    constructor(private readonly logger: ILogger) {}

    public async getHealthStatus(_req: Request, res: Response): Promise<Response> {
        return res.status(200).json({
            success: true,
            message: "Health check successful",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    }

    public async getLogs(req: Request, res: Response): Promise<Response> {
        const { date } = req.query as { date?: string };
        const logs = await this.logger.getLogs(date);

        return res.status(200).json({
            success: true,
            message: "Logs retrieved successfully",
            data: logs,
        });
    }
}
