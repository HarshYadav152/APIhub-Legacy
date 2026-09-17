import { ApiError } from "../utils/ApiError.js";

/**
 * Generic request validator. Pass a zod schema shaped like
 * { body?, params?, query? } and this replaces req.body/params/query
 * with the parsed (and coerced/defaulted) result.
 *
 * Not yet wired into existing routes — Phase 1 replaces the manual
 * `field?.trim() === ''` checks in each controller with a schema here.
 *
 * Usage:
 *   router.post("/register", validate(registerSchema), registerUser)
 */
export const validate = (schema) => (req, _res, next) => {
    const result = schema.safeParse({
        body: req.body,
        params: req.params,
        query: req.query,
    });

    if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
            field: issue.path.slice(1).join("."), // drop the body/params/query prefix
            message: issue.message,
        }));
        return next(new ApiError(400, "Validation failed", errors));
    }

    if (result.data.body) req.body = result.data.body;
    if (result.data.params) req.params = result.data.params;
    if (result.data.query) req.query = result.data.query;

    next();
};
