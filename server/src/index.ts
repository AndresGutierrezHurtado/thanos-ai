import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

// Middlewares
import { errorHandlerMiddleware, notFoundMiddleware, generalRateLimiter } from "./infrastructure/http/middlewares";

// Routes
import healthRoutes from "./infrastructure/http/routes/healthRoutes";

// App Config
process.loadEnvFile();
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
    origin: process.env.APP_URL,
    credentials: true,
}));

// Rate limiting general para todas las rutas API
app.use("/api/v1", generalRateLimiter);

// API Routes
app.use("/api/v1", healthRoutes);

// Error handling middleware (debe ir después de las rutas)
app.use(errorHandlerMiddleware);

// 404 handler (debe ir al final)
app.use(notFoundMiddleware);

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
