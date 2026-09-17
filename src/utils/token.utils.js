import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.config.js";

/**
 * Centralizes all JWT signing/verification so token logic exists in
 * exactly one place, regardless of whether the subject is a User or
 * a Hof. Models call these from their instance methods; middleware
 * and services call these directly.
 */
export const signAccessToken = (payload) =>
    jwt.sign(payload, env.ACCESS_TOKEN_SECRET, { expiresIn: env.ACCESS_TOKEN_EXPIRY });

export const signRefreshToken = (payload) =>
    jwt.sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn: env.REFRESH_TOKEN_EXPIRY });

export const verifyAccessToken = (token) => jwt.verify(token, env.ACCESS_TOKEN_SECRET);

export const verifyRefreshToken = (token) => jwt.verify(token, env.REFRESH_TOKEN_SECRET);

/**
 * Refresh tokens are stored server-side so they can be revoked (on
 * logout, or on detected reuse) — but stored as a hash, never in the
 * clear, the same way passwords are. A leaked database dump should
 * not hand out usable refresh tokens.
 */
export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
