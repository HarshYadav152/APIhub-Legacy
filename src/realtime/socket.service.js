import { Server } from "socket.io";
import { verifyAccessToken } from "../utils/token.utils.js";
import { env } from "../config/env.config.js";
import { logger } from "../config/logger.config.js";

let io = null;

const roomName = (accountType, accountId) => `account:${accountType}:${accountId}`;

/**
 * Called once from server.js with the raw http.Server instance (Socket.IO
 * needs to attach below Express, not go through it — this is why
 * server.js wraps `app` in http.createServer() instead of calling
 * app.listen() directly). Not called at all in tests that only exercise
 * the Express app via supertest, which is fine: emitToAccount() below
 * no-ops when `io` is still null.
 */
export const initSocketServer = (httpServer) => {
    io = new Server(httpServer, {
        cors: { origin: env.CORS_ORIGIN, credentials: true },
    });

    // Handshake auth reuses the same access tokens issued at login —
    // clients pass one via `socket.handshake.auth.token`, not a cookie
    // (Socket.IO's cookie handling is a separate concern from Express's
    // and not worth coupling to here).
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error("Unauthorized: missing access token"));
        }

        let decoded;
        try {
            decoded = verifyAccessToken(token);
        } catch {
            return next(new Error("Unauthorized: invalid or expired access token"));
        }

        socket.accountType = decoded.accountType === "hof" ? "Hof" : "User";
        socket.accountId = decoded._id;
        next();
    });

    io.on("connection", (socket) => {
        const room = roomName(socket.accountType, socket.accountId);
        socket.join(room);
        logger.info(`Socket connected: ${room} (${socket.id})`);

        socket.on("disconnect", () => {
            logger.info(`Socket disconnected: ${room} (${socket.id})`);
        });
    });

    logger.info("Socket.IO server initialized");
    return io;
};

/**
 * Pushes an event to every currently-connected socket for an account
 * (there can be more than one — multiple tabs/devices). This is a
 * best-effort real-time nicety, not a delivery guarantee: if nothing's
 * connected, or the socket server was never initialized at all (e.g.
 * in tests driving the Express app directly via supertest), this
 * simply no-ops. The REST conversation history is the actual source
 * of truth either way — a client that missed the push still sees the
 * message on its next GET /messaging/messages/:with fetch.
 */
export const emitToAccount = (accountType, accountId, event, payload) => {
    if (!io) return;
    io.to(roomName(accountType, accountId)).emit(event, payload);
};

export const getSocketServer = () => io;
