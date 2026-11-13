import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

function readUserId(req: Request): string | null {
    const header = req.get("Authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return null;

    const secret = process.env.JWT_SECRET ?? "default-secret-change-in-production";
    try {
        const payload = jwt.verify(token, secret) as { userId?: string };
        return payload.userId ?? null;
    } catch {
        // Invalid or expired token
        return null;
    }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
    const userId = readUserId(req);
    if (userId) {
        res.locals.userId = userId;
    }
    next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const userId = readUserId(req);
    if (!userId) {
        res.status(401).json({ success: false, message: "Debes iniciar sesión" });
        return;
    }
    res.locals.userId = userId;
    next();
}
