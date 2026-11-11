import { Request, Response, NextFunction } from "express";
import LoggerAdapter from "../../../infrastructure/services/LoggerAdapter";
import { SyslogSeverity } from "../../../application/ports/services/ILogger";

// Singleton logger for use in middlewares
let loggerInstance: LoggerAdapter | null = null;

function getLogger(): LoggerAdapter {
    if (!loggerInstance) {
        loggerInstance = new LoggerAdapter();
    }
    return loggerInstance;
}

export default function errorHandlerMiddleware(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
) {
    const logger = getLogger();

    // Log the error with complete context following RFC 5424
    logger.log(SyslogSeverity.ERROR, `Request error occurred`, {
        method: req.method,
        path: req.path,
        url: req.url,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        context: {
            message: error.message,
            stack: error.stack,
        },
    });

    // Streaming (SSE) responses already sent their headers: report the error
    // as a final event and close, instead of trying to send a JSON response.
    if (res.headersSent) {
        if (!res.writableEnded) {
            const contentType = String(res.getHeader("Content-Type") ?? "");
            if (contentType.startsWith("text/event-stream")) {
                res.write(`data: ${JSON.stringify({
                    success: false,
                    message: error.message || "An error occurred",
                })}\n\n`);
            }
            res.end();
        }
        return;
    }

    // Validation error or other known errors
    if (error instanceof Error) {
        return res.status(500).json({
            success: false,
            message: error.message || "An error occurred",
            ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
        });
    }

    // Unknown error
    return res.status(500).json({
        success: false,
        message: "An unexpected error occurred",
    });
}
