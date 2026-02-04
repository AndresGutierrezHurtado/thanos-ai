import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

// Middlewares
import { errorHandlerMiddleware, notFoundMiddleware, generalRateLimiter } from "./infrastructure/http/middlewares";

// Routes
import healthRoutes from "./infrastructure/http/routes/healthRoutes";
import messageRoutes from "./infrastructure/http/routes/messageRoutes";
import chatRoutes from "./infrastructure/http/routes/chatRoutes";
import driveRoutes from "./infrastructure/http/routes/driveRoutes";

// App Config
const app = express();

// The first thing we do is load the environment variables
process.loadEnvFile();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
    origin: process.env.APP_URL,
    credentials: true,
}));

// Rate limiting for all API endpoints
app.use("/api/v1", generalRateLimiter);

// API Routes
app.use("/api/v1", healthRoutes);
app.use("/api/v1", chatRoutes);
app.use("/api/v1", messageRoutes);
app.use("/api/v1", driveRoutes);

// Error handling middleware and 404 handler
app.use(errorHandlerMiddleware);
app.use(notFoundMiddleware);

// Start the server
app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
