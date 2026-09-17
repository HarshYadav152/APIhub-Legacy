import { describe, it, expect, jest, beforeEach } from "@jest/globals";

/**
 * Deliberately unset for this test file's module registry — env.config.js
 * only parses process.env once, the first time it's imported, so this
 * has to happen before any import (direct or transitive) reaches it.
 * This is what makes isRedisEnabled evaluate to false below.
 */
delete process.env.REDIS_URL;

const mockSendVerificationEmail = jest.fn();

jest.unstable_mockModule("../../src/services/mail/mail.service.js", () => ({
    sendVerificationEmail: mockSendVerificationEmail,
}));

const { enqueueVerificationEmail } = await import("../../src/services/queue/email.queue.js");
const { createEmailWorker } = await import("../../src/services/queue/email.worker.js");
const { isRedisEnabled } = await import("../../src/config/env.config.js");

beforeEach(() => {
    mockSendVerificationEmail.mockReset();
});

describe("email queue with no REDIS_URL configured", () => {
    it("reports the queue as disabled", () => {
        expect(isRedisEnabled).toBe(false);
    });

    it("enqueueVerificationEmail falls back to sending directly", async () => {
        mockSendVerificationEmail.mockResolvedValue(true);

        await enqueueVerificationEmail("test@example.com", "123456");

        expect(mockSendVerificationEmail).toHaveBeenCalledWith("test@example.com", "123456");
    });

    it("throws if the direct fallback send fails", async () => {
        mockSendVerificationEmail.mockResolvedValue(false);

        await expect(enqueueVerificationEmail("test@example.com", "123456")).rejects.toThrow(
            /failed to send/i
        );
    });

    it("createEmailWorker returns null — there's nothing to consume from", () => {
        expect(createEmailWorker()).toBeNull();
    });
});
