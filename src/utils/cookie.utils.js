import ms from "ms";
import { env, isProduction } from "../config/env.config.js";

/**
 * The legacy app hardcoded `secure: true` on auth cookies, which
 * browsers silently drop outside HTTPS — breaking cookie auth on
 * plain-HTTP local dev. `secure`/`sameSite` now follow the environment.
 */
const baseCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
};

export const accessTokenCookieOptions = () => ({
    ...baseCookieOptions,
    maxAge: ms(env.ACCESS_TOKEN_EXPIRY),
});

export const refreshTokenCookieOptions = () => ({
    ...baseCookieOptions,
    maxAge: ms(env.REFRESH_TOKEN_EXPIRY),
});

// Options passed to res.clearCookie must match the security-relevant
// options the cookie was originally set with (path/domain/sameSite/secure).
export const clearCookieOptions = () => baseCookieOptions;
