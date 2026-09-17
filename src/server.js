import http from "http";
import { env } from "./config/env.config.js";
import { logger } from "./config/logger.config.js";
import { connectDB, disconnectDB } from "./config/database.config.js";
import { app } from "./app.js";
import { initSocketServer } from "./realtime/socket.service.js";

let server;

const start = async () => {
    try {
        await connectDB();

        // Wrapping app in a raw http.Server (instead of app.listen()
        // directly) is what lets Socket.IO attach alongside Express on
        // the same port — it needs the underlying HTTP server, not just
        // the Express app.
        const httpServer = http.createServer(app);
        initSocketServer(httpServer);

        server = httpServer.listen(env.PORT, () => {
            logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
        });
    } catch (error) {
        logger.error("Failed to start server:", error);
        process.exit(1);
    }
};

const shutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    if (server) {
        server.close(async () => {
            await disconnectDB();
            logger.info("Shutdown complete.");
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Rejection:", reason);
    // fail fast rather than continue in a possibly-corrupt state
    process.exit(1);
});

process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception:", error);
    process.exit(1);
});

start();
