import rateLimit from "express-rate-limit";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * Baseline, app-wide limiter. Deliberately generous — this exists to
 * blunt gross abuse/scraping, not to police individual endpoints.
 * Phase 1 adds a stricter limiter specifically on /auth/login,
 * /auth/register and OTP endpoints, which need much tighter limits.
 */
export const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json(new ApiResponse(429, null, "Too many requests. Please try again later."));
    },
});

/**
 * Tighter limiter for login/register endpoints — these are the routes
 * credential-stuffing and brute-force tools actually target, so they
 * get a much smaller budget than the rest of the API.
 */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        res.status(429).json(
            new ApiResponse(429, null, "Too many attempts. Please try again in a few minutes.")
        );
    },
});

/**
 * OTP send/verify endpoints double as a mild email-bombing / brute-force
 * vector if left unlimited — a per-IP window on top of the app's own
 * per-account verificationAttempts lockout closes that gap.
 */
export const otpRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json(
            new ApiResponse(429, null, "Too many verification attempts. Please try again later.")
        );
    },
});
