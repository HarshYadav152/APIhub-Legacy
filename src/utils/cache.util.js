import { redisConnection } from "../config/redis.config.js";
import { isRedisEnabled } from "../config/env.config.js";
import { logger } from "../config/logger.config.js";

/**
 * Thin cache-aside helper for read-heavy endpoints. Reuses the same
 * optional Redis connection the email queue uses (see redis.config.js) —
 * one env var (REDIS_URL) turns on Redis-backed features generally.
 * With no Redis configured, every call here is a no-op / cache miss,
 * so callers always fall through to the database. Caching is purely an
 * opt-in performance improvement, never a correctness dependency.
 */

export const cacheGet = async (key) => {
    if (!isRedisEnabled) return null;

    try {
        const value = await redisConnection.get(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        // A cache read failure should degrade to "cache miss", not break
        // the request — the caller falls back to fetching from the DB.
        logger.error(`Cache read error for key "${key}": ${error.message}`);
        return null;
    }
};

export const cacheSet = async (key, value, ttlSeconds) => {
    if (!isRedisEnabled) return;

    try {
        await redisConnection.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (error) {
        logger.error(`Cache write error for key "${key}": ${error.message}`);
    }
};

export const cacheDelete = async (...keys) => {
    if (!isRedisEnabled || keys.length === 0) return;

    try {
        await redisConnection.del(...keys);
    } catch (error) {
        logger.error(`Cache delete error for keys [${keys.join(", ")}]: ${error.message}`);
    }
};

export const getCacheVersion = async (scope) => {
    if (!isRedisEnabled) return 0;

    try {
        const version = await redisConnection.get(`${scope}:version`);
        return version ? Number(version) : 0;
    } catch (error) {
        logger.error(`Cache version read error for "${scope}": ${error.message}`);
        return 0;
    }
};

/**
 * Invalidation strategy for endpoints with unbounded key variations
 * (e.g. paginated lists — one key per page/limit combination). Rather
 * than enumerating and deleting every possible key on a write, every
 * read key embeds this version number; bumping it on a write makes all
 * previously-cached reads for that scope unreachable in one O(1) call,
 * and they simply expire on their own TTL instead of needing cleanup.
 */
export const bumpCacheVersion = async (scope) => {
    if (!isRedisEnabled) return;

    try {
        await redisConnection.incr(`${scope}:version`);
    } catch (error) {
        logger.error(`Cache version bump error for "${scope}": ${error.message}`);
    }
};

/**
 * Cache-aside wrapper: return the cached value if present, otherwise
 * compute it, cache it, and return it. `compute` only runs on a miss.
 */
export const withCache = async (key, ttlSeconds, compute) => {
    const cached = await cacheGet(key);
    if (cached !== null) return cached;

    const value = await compute();
    await cacheSet(key, value, ttlSeconds);
    return value;
};
