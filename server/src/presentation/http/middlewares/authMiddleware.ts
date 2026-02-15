import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
    const header = req.get("Authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        next();
        return;
    }

    const secret = process.env.JWT_SECRET ?? "default-secret-change-in-production";
    try {
        const payload = jwt.verify(token, secret) as { userId?: string };
        if (payload.userId) {
            res.locals.userId = payload.userId;
        }
    } catch {
        // Invalid or expired token – continue without user
    }
    next();
}
