import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyAccessToken } from "../utils/token.utils.js";
import { COOKIE_NAMES } from "../config/constants.js";
import { User } from "../modules/users/user.model.js";
import { Hof } from "../modules/hof/hof.model.js";

const roleConfig = {
    user: { Model: User, cookieName: COOKIE_NAMES.USER_ACCESS_TOKEN, reqKey: "user" },
    hof: { Model: Hof, cookieName: COOKIE_NAMES.HOF_ACCESS_TOKEN, reqKey: "hof" },
};

/**
 * Shared by verifyAuth and verifyAnyAccount below — decodes and
 * validates a token, returning { role, subject }. Throws ApiError on
 * any failure (missing/invalid/expired token, or account no longer
 * exists) so both callers get identical error handling for identical
 * failure modes.
 */
const resolveTokenSubject = async (token, expectedRole) => {
    if (!token) {
        throw new ApiError(
            401,
            `Unauthorized: missing ${expectedRole ? `${expectedRole} ` : ""}access token`
        );
    }

    let decoded;
    try {
        decoded = verifyAccessToken(token);
    } catch (error) {
        const message =
            error?.name === "TokenExpiredError" ? "Access token has expired" : "Invalid access token";
        throw new ApiError(401, message);
    }

    const role = decoded.accountType === "hof" ? "hof" : "user";

    // Defense in depth: even though user/hof tokens travel in
    // differently-named cookies, a bearer token supplied via the
    // Authorization header has no such separation, so we also check
    // the token was actually issued for the role being asked for.
    if (expectedRole && role !== expectedRole) {
        throw new ApiError(401, "Token is not valid for this resource");
    }

    const config = roleConfig[role];
    const subject = await config.Model.findById(decoded._id);
    if (!subject) {
        throw new ApiError(401, `Invalid access token: ${role} account not found`);
    }

    return { role, config, subject };
};

/**
 * Replaces the legacy verifyMember.middleware.js and verifyHof.middleware.js.
 * Both did the same three things — read a bearer token from a cookie or
 * header, verify it, look the subject up and attach it to the request —
 * with only the model and cookie name differing. This factory keeps that
 * one behavior in one place instead of two copies that could drift.
 *
 * Usage: router.get("/me", verifyAuth("user"), getMe)
 * Sets req.user (role "user") or req.hof (role "hof").
 */
export const verifyAuth = (role) => {
    const config = roleConfig[role];
    if (!config) {
        throw new Error(`verifyAuth: unknown role "${role}" — expected "user" or "hof"`);
    }

    return asyncHandler(async (req, _res, next) => {
        const token = req.cookies?.[config.cookieName] || req.header("Authorization")?.replace("Bearer ", "");
        const { subject } = await resolveTokenSubject(token, role);
        req[config.reqKey] = subject;
        next();
    });
};

/**
 * For routes where the caller can legitimately be either a User or a
 * Hof and the logic doesn't care which — messaging is the first case
 * of this. Unlike verifyAuth(role), this doesn't know in advance which
 * cookie to look for, so it checks both cookie slots plus a bearer
 * header, and trusts the token's own `accountType` claim (embedded at
 * login — see token.utils.js) to determine which one it is, rather
 * than trying each candidate against both models.
 *
 * Sets req.user or req.hof (same as verifyAuth) AND a normalized
 * req.account = { type: "User" | "Hof", id, doc }, so downstream
 * messaging code can stay role-agnostic instead of branching on which
 * of req.user/req.hof happens to be set.
 */
export const verifyAnyAccount = asyncHandler(async (req, _res, next) => {
    const token =
        req.cookies?.[COOKIE_NAMES.USER_ACCESS_TOKEN] ||
        req.cookies?.[COOKIE_NAMES.HOF_ACCESS_TOKEN] ||
        req.header("Authorization")?.replace("Bearer ", "");

    const { role, config, subject } = await resolveTokenSubject(token, null);

    req[config.reqKey] = subject;
    req.account = { type: role === "hof" ? "Hof" : "User", id: subject._id, doc: subject };
    next();
});
