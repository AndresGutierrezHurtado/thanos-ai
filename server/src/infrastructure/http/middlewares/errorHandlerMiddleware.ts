import { Request, Response, NextFunction } from "express";
import LoggerAdapter from "../../services/LoggerAdapter";
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
    logger.log(SyslogSeverity.ERROR, "Request error occurred", {
        error,
        msgId: "HTTP_ERROR",
        structuredData: {
            method: req.method,
            path: req.path,
            url: req.url,
            ip: req.ip,
            userAgent: req.get("user-agent"),
            statusCode: 500,
            context: {
                file: error.stack?.split("\n")[1]?.trim(),
                line: error.stack?.split("\n")[2]?.trim(),
                column: error.stack?.split("\n")[3]?.trim(),
                function: error.stack?.split("\n")[4]?.trim(),
            },
        },
    });

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

