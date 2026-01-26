import { Request, Response, NextFunction } from "express";

export default function errorHandlerMiddleware(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error("Error:", error);

    // Error de validación u otros errores conocidos
    if (error instanceof Error) {
        return res.status(500).json({
            success: false,
            message: error.message || "An error occurred",
            ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
        });
    }

    // Error desconocido
    return res.status(500).json({
        success: false,
        message: "An unexpected error occurred",
    });
}

