import { Queue } from "bullmq";
import { redisConnection } from "../../config/redis.config.js";
import { isRedisEnabled } from "../../config/env.config.js";
import { logger } from "../../config/logger.config.js";
import { sendVerificationEmail } from "../mail/mail.service.js";

export const EMAIL_QUEUE_NAME = "email-verification";

// Only constructed when Redis is actually configured — a bare `new
// Queue(...)` with a null connection would throw immediately.
export const emailQueue = isRedisEnabled
    ? new Queue(EMAIL_QUEUE_NAME, { connection: redisConnection })
    : null;

if (emailQueue) {
    emailQueue.on("error", (error) => {
        logger.error(`Email queue error: ${error.message}`);
    });
}

/**
 * What request handlers call instead of sendVerificationEmail directly.
 *
 * With REDIS_URL configured: enqueues a job and returns immediately —
 * the actual SMTP send happens in the worker process (src/worker.js),
 * with automatic retries if SMTP is temporarily down.
 *
 * Without it: falls back to sending inline, synchronously, exactly like
 * before Phase 3 introduced the queue. This keeps the app fully
 * functional with zero infrastructure beyond MongoDB — Redis is an
 * opt-in scalability improvement, not a requirement.
 */
export const enqueueVerificationEmail = async (email, otp) => {
    if (!isRedisEnabled) {
        const sent = await sendVerificationEmail(email, otp);
        if (!sent) {
            throw new Error(`Failed to send verification email to ${email}`);
        }
        return;
    }

    await emailQueue.add(
        "send-verification-otp",
        { email, otp },
        {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: 100,
            removeOnFail: 500,
        }
    );
};
