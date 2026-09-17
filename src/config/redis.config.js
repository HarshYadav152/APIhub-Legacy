import IORedis from "ioredis";
import { env, isRedisEnabled } from "./env.config.js";
import { logger } from "./logger.config.js";

/**
 * Redis is an optional enhancement, not a hard dependency — the app is
 * fully functional without it (see email.queue.js's fallback path).
 * `redisConnection` is only constructed at all when REDIS_URL is set;
 * otherwise it stays null and nothing ever attempts a connection, so
 * there's no background retry noise for a service the deployment isn't
 * using.
 *
 * When it IS configured: `maxRetriesPerRequest: null` is required by
 * BullMQ specifically (it manages retries itself and throws at startup
 * without this). `commandTimeout` bounds how long a queue.add() call can
 * hang if Redis becomes unreachable after startup. `retryStrategy` caps
 * the reconnect backoff so a real outage logs sanely instead of looping.
 */
export const redisConnection = isRedisEnabled
    ? new IORedis(env.REDIS_URL, {
          maxRetriesPerRequest: null,
          commandTimeout: 5000,
          retryStrategy: (attempt) => Math.min(attempt * 1000, 30000),
      })
    : null;

if (redisConnection) {
    redisConnection.on("error", (error) => {
        logger.error(`Redis connection error: ${error.message}`);
    });

    redisConnection.on("connect", () => {
        logger.info(`Redis connected (${env.REDIS_URL})`);
    });
} else {
    logger.info("REDIS_URL not set — email queue disabled, verification emails send synchronously.");
}
