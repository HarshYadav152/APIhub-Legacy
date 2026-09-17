import { describe, it, expect } from "@jest/globals";
import { api } from "../helpers/appWithMockedQueue.js";
import { extractCookie } from "../helpers/cookies.js";

const newHof = (overrides = {}) => ({
    name: "Grace Hopper",
    email: `grace+${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: "correct-horse-battery-staple",
    ...overrides,
});

describe("POST /api/v1/hof/register", () => {
    it("registers a new HOF and returns 201", async () => {
        const res = await api.post("/api/v1/hof/register").send(newHof());

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.hof_email).toBeDefined();
        expect(res.body.data.password).toBeUndefined(); // never leak the hash
    });

    it("rejects a duplicate email with 409", async () => {
        const payload = newHof();
        await api.post("/api/v1/hof/register").send(payload);

        const res = await api.post("/api/v1/hof/register").send(payload);
        expect(res.status).toBe(409);
    });

    it("rejects an invalid payload with 400", async () => {
        const res = await api.post("/api/v1/hof/register").send({ email: "not-an-email" });
        expect(res.status).toBe(400);
    });
});

describe("POST /api/v1/hof/entry", () => {
    it("logs in with correct credentials and sets access + refresh cookies", async () => {
        const payload = newHof();
        await api.post("/api/v1/hof/register").send(payload);

        const res = await api
            .post("/api/v1/hof/entry")
            .send({ email: payload.email, password: payload.password });

        expect(res.status).toBe(200);
        expect(res.body.data.accessToken).toBeDefined();
        expect(extractCookie(res, "HaccessToken")).toBeTruthy();
        expect(extractCookie(res, "HrefreshToken")).toBeTruthy();
    });

    it("rejects a wrong password with a generic 401 message", async () => {
        const payload = newHof();
        await api.post("/api/v1/hof/register").send(payload);

        const res = await api.post("/api/v1/hof/entry").send({ email: payload.email, password: "wrong" });
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/invalid email or password/i);
    });
});

describe("POST /api/v1/hof/refresh-token", () => {
    it("rotates the refresh token and rejects reuse of the old one", async () => {
        const payload = newHof();
        await api.post("/api/v1/hof/register").send(payload);
        const loginRes = await api
            .post("/api/v1/hof/entry")
            .send({ email: payload.email, password: payload.password });
        const originalRefreshCookie = extractCookie(loginRes, "HrefreshToken");

        const firstRefresh = await api
            .post("/api/v1/hof/refresh-token")
            .set("Cookie", [originalRefreshCookie]);
        expect(firstRefresh.status).toBe(200);

        const reuseAttempt = await api
            .post("/api/v1/hof/refresh-token")
            .set("Cookie", [originalRefreshCookie]);
        expect(reuseAttempt.status).toBe(401);
    });
});

describe("POST /api/v1/hof/logout", () => {
    it("requires authentication", async () => {
        const res = await api.post("/api/v1/hof/logout");
        expect(res.status).toBe(401);
    });
});

describe("cross-role token isolation", () => {
    it("rejects a HOF access token used via the Authorization header on a user-only route", async () => {
        const hofPayload = newHof();
        await api.post("/api/v1/hof/register").send(hofPayload);
        const loginRes = await api
            .post("/api/v1/hof/entry")
            .send({ email: hofPayload.email, password: hofPayload.password });
        const hofAccessToken = loginRes.body.data.accessToken;

        // A HOF token should never authenticate a user-only route, even
        // presented "correctly" via the Authorization header.
        const res = await api.post("/api/v1/members/logout").set("Authorization", `Bearer ${hofAccessToken}`);

        expect(res.status).toBe(401);
    });
});
