import mongoose from "mongoose";
import { env } from "./env.config.js";
import { logger } from "./logger.config.js";

/**
 * Connects to MongoDB using the pre-validated connection string.
 * Throws instead of calling process.exit() directly so the caller
 * (server.js) controls process lifecycle — this keeps the function
 * testable and reusable (e.g. from test setup, scripts, etc).
 */
export const connectDB = async () => {
    const uri = `${env.MONGODB_URI}/${env.DB_NAME}`;
    const connection = await mongoose.connect(uri);
    logger.info(`MongoDB connected → host: ${connection.connection.host}, db: ${connection.connection.name}`);
    return connection;
};

export const disconnectDB = async () => {
    await mongoose.disconnect();
    logger.info("MongoDB disconnected");
};

export const getDbState = () => {
    const states = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
    return {
        state: states[mongoose.connection.readyState] ?? "unknown",
        isConnected: mongoose.connection.readyState === 1,
    };
};
