import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import next from "next";
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

// Next.js frontend (client workspace) is served by this same process and port
const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT) || 3000;
const clientDir = fileURLToPath(new URL("../../client", import.meta.url));
const nextApp = next({ dev, dir: clientDir, port });
const handleNext = nextApp.getRequestHandler();
await nextApp.prepare();

// App Config
const app = express();

// REST API: everything Express-specific stays scoped to /api/v1 so Next.js
// receives its requests untouched (raw body, its own 404 pages, etc.)
const api = express.Router();
api.use(bodyParser.json({ limit: "10mb" }));
api.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
api.use(cors({
    origin: process.env.APP_URL,
    credentials: true,
    exposedHeaders: ["Authorization"],
}));
api.use(generalRateLimiter);
api.use(healthRoutes);
api.use(authRoutes);
api.use(chatRoutes);
api.use(messageRoutes);
api.use(driveRoutes);
api.use(errorHandlerMiddleware);
api.use(notFoundMiddleware);
app.use("/api/v1", api);

// Static files from server/public
const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));

// Everything else is the Next.js app
app.use((req, res) => handleNext(req, res));

// HTTP server + WebSocket (Socket.IO) for P2P signaling.
// destroyUpgrade: false leaves non-Socket.IO upgrades (Next.js HMR) alone.
const server = http.createServer(app);
const io = new SocketServer(server, {
    cors: { origin: process.env.APP_URL, credentials: true },
    destroyUpgrade: false,
});
registerWebSocketHandler(io);

server.listen(port, () => {
    console.log(`Server is running on port ${port} (${dev ? "development" : "production"})`);
});
