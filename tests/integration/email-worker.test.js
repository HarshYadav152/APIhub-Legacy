import { describe, it, expect, jest, beforeEach } from "@jest/globals";

/**
 * Unit-tests processEmailJob directly, as a plain function. This
 * deliberately mocks bullmq and the Redis connection too, not just the
 * mail service — email.worker.js imports email.queue.js, which
 * constructs a real `new Queue(...)` (and a real `new IORedis(...)`
 * underneath) at module-load time. Without mocking those, importing
 * this file for a "unit test" would silently start real background
 * reconnect attempts and leave open handles behind. What's actually
 * under test is the mapping from job data to a sendVerificationEmail
 * call, not BullMQ or Redis themselves.
 */
const mockSendVerificationEmail = jest.fn();

jest.unstable_mockModule("../../src/services/mail/mail.service.js", () => ({
    sendVerificationEmail: mockSendVerificationEmail,
}));

jest.unstable_mockModule("../../src/config/redis.config.js", () => ({
    redisConnection: {},
}));

jest.unstable_mockModule("bullmq", () => ({
    Queue: jest.fn().mockImplementation(() => ({ add: jest.fn(), on: jest.fn() })),
    Worker: jest.fn().mockImplementation(() => ({ on: jest.fn(), close: jest.fn() })),
}));

const { processEmailJob } = await import("../../src/services/queue/email.worker.js");

beforeEach(() => {
    mockSendVerificationEmail.mockReset();
});

describe("processEmailJob", () => {
    it("sends the verification email for the job's email/otp payload", async () => {
        mockSendVerificationEmail.mockResolvedValue(true);

        const result = await processEmailJob({
            data: { email: "test@example.com", otp: "123456" },
        });

        expect(mockSendVerificationEmail).toHaveBeenCalledWith("test@example.com", "123456");
        expect(result).toEqual({ sent: true });
    });

    it("throws when sending fails, so BullMQ's retry/backoff policy kicks in", async () => {
        mockSendVerificationEmail.mockResolvedValue(false);

        await expect(processEmailJob({ data: { email: "fail@example.com", otp: "000000" } })).rejects.toThrow(
            /failed to send/i
        );
    });
});
