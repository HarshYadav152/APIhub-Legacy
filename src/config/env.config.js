import dotenv from "dotenv";
import { z } from "zod";

// Load .env exactly once, at the single entry point for all env access.
// No other file in this codebase should call dotenv.config() or read
// process.env directly — everything imports the validated `env` object below.
dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),

    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
    DB_NAME: z.string().min(1).default("apihub_legacy"),

    ACCESS_TOKEN_SECRET: z.string().min(32, "ACCESS_TOKEN_SECRET must be at least 32 characters"),
    ACCESS_TOKEN_EXPIRY: z.string().default("15m"),
    REFRESH_TOKEN_SECRET: z.string().min(32, "REFRESH_TOKEN_SECRET must be at least 32 characters"),
    REFRESH_TOKEN_EXPIRY: z.string().default("10d"),

    CORS_ORIGIN: z.string().default("http://localhost:5173"),

    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),

    EMAIL_SERVICE: z.string().default("gmail"),
    FROM_EMAIL: z.string().email().optional(),
    APP_PASSWORD: z.string().optional(),

    LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).default("info"),

    // Backs the email job queue (BullMQ) — genuinely optional. If unset,
    // verification emails send synchronously from the web process instead
    // of being queued for a separate worker. No default on purpose: the
    // presence/absence of this var is exactly what toggles the behavior.
    REDIS_URL: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    // Fail fast and loud. A misconfigured environment should never let the
    // process limp into a half-working state — that's how the old health
    // check ended up throwing on a missing import instead of failing at boot.
    console.error("❌ Invalid or missing environment variables:");
    for (const issue of parsed.error.issues) {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
}

export const env = Object.freeze(parsed.data);
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

// The single source of truth for "is Redis configured" — every
// Redis-touching module (the email queue, response caching) checks this
// instead of re-deriving it, so there's exactly one place that decides
// what counts as "configured".
export const isRedisEnabled = Boolean(env.REDIS_URL);
