import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { logger } from "../config/logger.config.js";
import { isProduction } from "../config/env.config.js";

/**
 * Normalizes any thrown error — ApiError, Mongoose errors, JWT errors,
 * or anything unexpected — into a consistent ApiError shape.
 * This is what the legacy app was missing: every `throw new ApiError(...)`
 * or unhandled rejection now reaches exactly one place that knows how to
 * turn it into a proper HTTP response, instead of falling through to
 * Express's default HTML error page.
 */
const normalizeError = (err) => {
    if (err instanceof ApiError) return err;

    if (err instanceof mongoose.Error.ValidationError) {
        const errors = Object.values(err.errors).map((e) => e.message);
        return new ApiError(400, "Validation failed", errors);
    }

    if (err instanceof mongoose.Error.CastError) {
        return new ApiError(400, `Invalid value for field '${err.path}'`);
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue ?? {})[0] ?? "field";
        return new ApiError(409, `A record with this ${field} already exists`);
    }

    if (err.name === "JsonWebTokenError") {
        return new ApiError(401, "Invalid access token");
    }

    if (err.name === "TokenExpiredError") {
        return new ApiError(401, "Access token has expired");
    }

    // Unknown / unexpected error — never leak internals to the client.
    return new ApiError(
        err.statusCode ?? 500,
        isProduction ? "Something went wrong on our end" : err.message,
        [],
        err.stack
    );
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
    const apiError = normalizeError(err);

    logger.error(
        `[${req.id}] ${req.method} ${req.originalUrl} → ${apiError.statusCode} ${apiError.message}`,
        {
            stack: isProduction ? undefined : apiError.stack,
        }
    );

    const response = new ApiResponse(apiError.statusCode, null, apiError.message);
    response.errors = apiError.errors;
    response.requestId = req.id;
    if (!isProduction && apiError.stack) response.stack = apiError.stack;

    return res.status(apiError.statusCode).json(response);
};
