import { Worker } from "bullmq";
import { redisConnection } from "../../config/redis.config.js";
import { isRedisEnabled } from "../../config/env.config.js";
import { EMAIL_QUEUE_NAME } from "./email.queue.js";
import { sendVerificationEmail } from "../mail/mail.service.js";
import { logger } from "../../config/logger.config.js";

/**
 * Exported separately from createEmailWorker so it can be unit-tested
 * as a plain function — calling it directly with a fake `job` object
 * exercises the real job-processing logic without needing a live Redis
 * connection or an actual running Worker.
 */
export const processEmailJob = async (job) => {
    const { email, otp } = job.data;

    const sent = await sendVerificationEmail(email, otp);
    if (!sent) {
        // Throwing (rather than returning a failure flag) is what tells
        // BullMQ to apply the job's retry/backoff policy.
        throw new Error(`Failed to send verification email to ${email}`);
    }

    return { sent: true };
};

export const createEmailWorker = () => {
    // Nothing to consume from without Redis configured — the caller
    // (src/worker.js) is expected to check this and exit cleanly rather
    // than try to run a worker with no queue behind it.
    if (!isRedisEnabled) {
        return null;
    }

    const worker = new Worker(EMAIL_QUEUE_NAME, processEmailJob, {
        connection: redisConnection,
        concurrency: 5,
    });

    worker.on("completed", (job) => logger.info(`Email job ${job.id} completed (${job.data.email})`));
    worker.on("failed", (job, error) => logger.error(`Email job ${job?.id} failed: ${error.message}`));
    worker.on("error", (error) => logger.error(`Email worker error: ${error.message}`));

    return worker;
};
