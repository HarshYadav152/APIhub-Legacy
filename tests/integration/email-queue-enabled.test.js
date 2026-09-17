import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Set before any import reaches env.config.js, so isRedisEnabled
// evaluates to true for this test file's module registry.
process.env.REDIS_URL = "redis://fake-host:6379";

const mockAdd = jest.fn().mockResolvedValue(undefined);
const mockQueueOn = jest.fn();
const mockWorkerOn = jest.fn();
const mockWorkerClose = jest.fn();

// Mock bullmq itself — a real `new Queue()`/`new Worker()` would try to
// use the (fake, unreachable) redisConnection. redis.config.js is mocked
// too, so no real IORedis instance gets constructed either; otherwise
// it would start real background reconnect attempts against a host that
// doesn't exist.
jest.unstable_mockModule("bullmq", () => ({
    Queue: jest.fn().mockImplementation(() => ({ add: mockAdd, on: mockQueueOn })),
    Worker: jest.fn().mockImplementation(() => ({ on: mockWorkerOn, close: mockWorkerClose })),
}));

jest.unstable_mockModule("../../src/config/redis.config.js", () => ({
    redisConnection: {},
}));

const mockSendVerificationEmail = jest.fn();
jest.unstable_mockModule("../../src/services/mail/mail.service.js", () => ({
    sendVerificationEmail: mockSendVerificationEmail,
}));

const { enqueueVerificationEmail } = await import("../../src/services/queue/email.queue.js");
const { createEmailWorker } = await import("../../src/services/queue/email.worker.js");
const { isRedisEnabled } = await import("../../src/config/env.config.js");

beforeEach(() => {
    mockAdd.mockClear();
    mockSendVerificationEmail.mockReset();
});

describe("email queue with REDIS_URL configured", () => {
    it("reports the queue as enabled", () => {
        expect(isRedisEnabled).toBe(true);
    });

    it("enqueueVerificationEmail adds a job instead of sending directly", async () => {
        await enqueueVerificationEmail("test@example.com", "123456");

        expect(mockAdd).toHaveBeenCalledWith(
            "send-verification-otp",
            { email: "test@example.com", otp: "123456" },
            expect.objectContaining({ attempts: 3 })
        );
        expect(mockSendVerificationEmail).not.toHaveBeenCalled();
    });

    it("createEmailWorker returns a worker instance", () => {
        expect(createEmailWorker()).not.toBeNull();
    });
});
