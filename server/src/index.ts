import http from "http";
import path from "path";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Server as SocketServer } from "socket.io";
import { registerWebSocketHandler } from "./presentation/websockets/websocketsHandler.js";

// Middlewares
import { errorHandlerMiddleware, notFoundMiddleware, generalRateLimiter } from "./presentation/http/middlewares";

// Routes
import healthRoutes from "./presentation/http/routes/healthRoutes";
import authRoutes from "./presentation/http/routes/authRoutes";
import messageRoutes from "./presentation/http/routes/messageRoutes";
import chatRoutes from "./presentation/http/routes/chatRoutes";
import driveRoutes from "./presentation/http/routes/driveRoutes";

// App Config
const app = express();

// The first thing we do is load the environment variables
process.loadEnvFile();

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors({
    origin: process.env.APP_URL,
    credentials: true,
    exposedHeaders: ["Authorization"],
}));

// Static files from server/public
const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));

// Rate limiting for all API endpoints
app.use("/api/v1", generalRateLimiter);

// API Routes
app.use("/api/v1", healthRoutes);
app.use("/api/v1", authRoutes);
app.use("/api/v1", chatRoutes);
app.use("/api/v1", messageRoutes);
app.use("/api/v1", driveRoutes);

// Error handling middleware and 404 handler
app.use(errorHandlerMiddleware);
app.use(notFoundMiddleware);

// HTTP server + WebSocket (Socket.IO) for P2P signaling
const server = http.createServer(app);
const io = new SocketServer(server, {
    cors: { origin: process.env.APP_URL, credentials: true },
});
registerWebSocketHandler(io);

server.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
