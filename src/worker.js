import { env, isRedisEnabled } from "./config/env.config.js";
import { logger } from "./config/logger.config.js";
import { createEmailWorker } from "./services/queue/email.worker.js";

/**
 * Runs as its own process (`npm run worker`, or the `worker` service in
 * docker-compose) — deliberately separate from server.js so the web
 * tier and the job-processing tier can be deployed and scaled
 * independently.
 *
 * Redis/the queue are optional (see email.queue.js) — if REDIS_URL isn't
 * set, there's no queue for this process to consume from, since the web
 * process is already sending verification emails inline. Running the
 * worker in that configuration would do nothing useful, so it exits
 * with a clear message instead of idling forever.
 */
if (!isRedisEnabled) {
    logger.warn(
        "REDIS_URL is not set — there is no email queue to process. " +
            "The web server sends verification emails inline instead. Nothing to do; exiting."
    );
    process.exit(0);
}

const worker = createEmailWorker();
logger.info(`Email worker started in ${env.NODE_ENV} mode`);

const shutdown = async (signal) => {
    logger.info(`${signal} received. Closing worker...`);
    await worker.close();
    logger.info("Worker shutdown complete.");
    process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Rejection in worker:", reason);
    process.exit(1);
});

process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception in worker:", error);
    process.exit(1);
});
