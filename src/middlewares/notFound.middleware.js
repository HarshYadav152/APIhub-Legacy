import { ApiError } from "../utils/ApiError.js";

/**
 * Mounted after all routes. Anything that reaches here didn't match
 * a route, so we forward a consistent 404 into the error handler
 * instead of letting Express send its default "Cannot GET /x" text.
 */
export const notFound = (req, _res, next) => {
    next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};
