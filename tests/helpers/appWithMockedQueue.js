import { jest } from "@jest/globals";

/**
 * Requests now enqueue an email job rather than sending mail directly
 * (Phase 3) — so what needs mocking for tests moved from the mail
 * service to the queue producer. Same reasoning as before applies:
 * jest.unstable_mockModule + dynamic import, because Jest's ESM support
 * can't hoist `jest.mock()` the way it does for CommonJS.
 *
 * We don't spin up a real Redis or worker in integration tests — that
 * would be testing BullMQ/Redis, not this application's logic. The
 * worker's job-processing function (processEmailJob) is unit-tested
 * directly in tests/integration/email-worker.test.js instead.
 */
export const mockEnqueueVerificationEmail = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule("../../src/services/queue/email.queue.js", () => ({
    enqueueVerificationEmail: mockEnqueueVerificationEmail,
}));

const request = (await import("supertest")).default;
const { app } = await import("../../src/app.js");

export const api = request(app);

export const lastOtpSentTo = (email) => {
    const call = mockEnqueueVerificationEmail.mock.calls.findLast(([toEmail]) => toEmail === email);
    return call?.[1] ?? null;
};
