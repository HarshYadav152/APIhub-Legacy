import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import hpp from "hpp";

import { env, isProduction } from "./config/env.config.js";
import { API_PREFIX } from "./config/constants.js";
import { httpLogStream } from "./config/logger.config.js";
import { requestId } from "./middlewares/requestId.middleware.js";
import { sanitizeInput } from "./middlewares/sanitize.middleware.js";
import { globalRateLimiter } from "./middlewares/rateLimiter.middleware.js";
import { notFound } from "./middlewares/notFound.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import apiRouter from "./routes/index.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1); // needed for correct client IPs / secure cookies behind a reverse proxy

// Runs before everything else so req.id is available to every subsequent
// middleware, including the HTTP access log and the error handler.
app.use(requestId);

app.use(helmet());
app.use(
    cors({
        // CORS_ORIGIN must be a full origin (scheme + host + port), e.g.
        // "http://localhost:5173" — the legacy config used "localhost:5173"
        // (no scheme), which never matches a browser's Origin header.
        origin: env.CORS_ORIGIN,
        credentials: true,
    })
);
app.use(compression());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// hpp works correctly on req.body but NOT on req.query under Express 5
// (verified directly — it silently fails to dedupe there because
// req.query is a getter, not a plain mutable property). Query params
// are still protected: this app validates every one through Zod, which
// rejects an array where a scalar (page, limit, email, ...) is expected.
app.use(hpp());

// Custom sanitizer, not express-mongo-sanitize — that package crashes on
// every request with a query string under Express 5 (it reassigns
// req.query, which has no setter). See sanitize.middleware.js for the
// full explanation and what's covered instead.
app.use(sanitizeInput);

morgan.token("id", (req) => req.id);
app.use(
    morgan(isProduction ? ":id :method :url :status :res[content-length] - :response-time ms" : "dev", {
        stream: httpLogStream,
    })
);
app.use(globalRateLimiter);

// Unprefixed liveness ping for load balancers / container orchestrators.
// Deep health info (DB state, memory, etc.) lives at `${API_PREFIX}/health`.
app.get("/", (_req, res) => res.status(200).json({ status: "UP" }));

app.use(API_PREFIX, apiRouter);

app.use(notFound);
app.use(errorHandler);

export { app };
