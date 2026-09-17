/**
 * Replaces express-mongo-sanitize, which is incompatible with Express 5:
 * it reassigns `req.query` directly, and Express 5 made `req.query` a
 * getter with no setter — every request with a query string throws
 * `TypeError: Cannot set property query of #<IncomingMessage> which has
 * only a getter`. This was verified directly against Express 5.1.0
 * (not assumed from changelogs) before writing this replacement.
 *
 * req.query is deliberately NOT sanitized here — mutating the object
 * returned by req.query has no effect either, since Express 5's getter
 * recomputes a fresh object from the raw query string on every access
 * (also verified directly). In practice this isn't a gap for this app:
 * Express 5's default query parser doesn't produce nested objects from
 * bracket notation the way Express 4 + qs did (`?a[$gt]=1` parses to
 * the literal flat key "a[$gt]", not `{ a: { $gt: '1' } }`), and every
 * query param this app reads is validated (and coerced) through a Zod
 * schema before use, which independently rejects non-scalar values.
 *
 * req.body and req.params ARE plain mutable objects in Express 5, so
 * this sanitizes those recursively by stripping any key that starts
 * with "$" or contains "." — the two characters that let user input
 * be interpreted as MongoDB query operators/paths instead of literal
 * values.
 */
const isPlainObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

const sanitizeValue = (value) => {
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }

    if (isPlainObject(value)) {
        const clean = {};
        for (const [key, val] of Object.entries(value)) {
            if (key.startsWith("$") || key.includes(".")) {
                continue;
            }
            clean[key] = sanitizeValue(val);
        }
        return clean;
    }

    return value;
};

export const sanitizeInput = (req, _res, next) => {
    if (req.body && isPlainObject(req.body)) {
        req.body = sanitizeValue(req.body);
    }

    if (req.params && isPlainObject(req.params)) {
        req.params = sanitizeValue(req.params);
    }

    next();
};
