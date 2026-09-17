import { describe, it, expect } from "@jest/globals";
import { api } from "../helpers/appWithMockedQueue.js";
import { extractCookie } from "../helpers/cookies.js";

const newUser = (overrides = {}) => ({
    uname: "Ada Lovelace",
    uemail: `ada+${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    upassword: "correct-horse-battery-staple",
    ...overrides,
});

describe("POST /api/v1/members/register-user", () => {
    it("registers a new user and returns 201 with needsVerification true", async () => {
        const payload = newUser();
        const res = await api.post("/api/v1/members/register-user").send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.needsVerification).toBe(true);
        expect(res.body.data.userId).toBeDefined();
    });

    it("rejects a duplicate email with 409", async () => {
        const payload = newUser();
        await api.post("/api/v1/members/register-user").send(payload);

        const res = await api.post("/api/v1/members/register-user").send(payload);

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
    });

    it("rejects missing fields with a 400 validation error instead of hitting the DB", async () => {
        const res = await api.post("/api/v1/members/register-user").send({ uemail: "not-an-email" });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(Array.isArray(res.body.errors)).toBe(true);
    });

    it("rejects a password shorter than 8 characters", async () => {
        const res = await api.post("/api/v1/members/register-user").send(newUser({ upassword: "short" }));
        expect(res.status).toBe(400);
    });
});

describe("POST /api/v1/members/login-user", () => {
    it("logs in with correct credentials and sets access + refresh cookies", async () => {
        const payload = newUser();
        await api.post("/api/v1/members/register-user").send(payload);

        const res = await api
            .post("/api/v1/members/login-user")
            .send({ uemail: payload.uemail, upassword: payload.upassword });

        expect(res.status).toBe(200);
        expect(res.body.data.accessToken).toBeDefined();
        expect(extractCookie(res, "UaccessToken")).toBeTruthy();
        expect(extractCookie(res, "UrefreshToken")).toBeTruthy();
    });

    it("rejects a wrong password with 401 and a generic message", async () => {
        const payload = newUser();
        await api.post("/api/v1/members/register-user").send(payload);

        const res = await api
            .post("/api/v1/members/login-user")
            .send({ uemail: payload.uemail, upassword: "wrong-password" });

        expect(res.status).toBe(401);
        // Same message as "email not found" — see comment in user.controller.js.
        expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it("rejects a login for an email that was never registered with the same generic message", async () => {
        const res = await api
            .post("/api/v1/members/login-user")
            .send({ uemail: "nobody@example.com", upassword: "whatever123" });

        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/invalid email or password/i);
    });
});

describe("POST /api/v1/members/refresh-token", () => {
    const login = async () => {
        const payload = newUser();
        await api.post("/api/v1/members/register-user").send(payload);
        return api
            .post("/api/v1/members/login-user")
            .send({ uemail: payload.uemail, upassword: payload.upassword });
    };

    it("issues a new access token given a valid refresh cookie", async () => {
        const loginRes = await login();
        const refreshCookie = extractCookie(loginRes, "UrefreshToken");

        const res = await api.post("/api/v1/members/refresh-token").set("Cookie", [refreshCookie]);

        expect(res.status).toBe(200);
        expect(res.body.data.accessToken).toBeDefined();
        expect(extractCookie(res, "UrefreshToken")).toBeTruthy();
    });

    it("rejects a missing refresh token with 401", async () => {
        const res = await api.post("/api/v1/members/refresh-token");
        expect(res.status).toBe(401);
    });

    it("rejects reuse of an already-rotated refresh token (reuse detection)", async () => {
        const loginRes = await login();
        const originalRefreshCookie = extractCookie(loginRes, "UrefreshToken");

        // First use rotates the token — this should succeed.
        const firstRefresh = await api
            .post("/api/v1/members/refresh-token")
            .set("Cookie", [originalRefreshCookie]);
        expect(firstRefresh.status).toBe(200);

        // Reusing the now-stale original token should be rejected, not
        // silently accepted — this is what prevents a stolen refresh
        // token from being used alongside the legitimate one indefinitely.
        const reuseAttempt = await api
            .post("/api/v1/members/refresh-token")
            .set("Cookie", [originalRefreshCookie]);

        expect(reuseAttempt.status).toBe(401);
    });
});

describe("POST /api/v1/members/logout", () => {
    it("requires authentication", async () => {
        const res = await api.post("/api/v1/members/logout");
        expect(res.status).toBe(401);
    });

    it("clears cookies and revokes the refresh token when authenticated", async () => {
        const payload = newUser();
        await api.post("/api/v1/members/register-user").send(payload);
        const loginRes = await api
            .post("/api/v1/members/login-user")
            .send({ uemail: payload.uemail, upassword: payload.upassword });

        const accessCookie = extractCookie(loginRes, "UaccessToken");
        const refreshCookie = extractCookie(loginRes, "UrefreshToken");

        const logoutRes = await api.post("/api/v1/members/logout").set("Cookie", [accessCookie]);
        expect(logoutRes.status).toBe(200);

        // The refresh token that was valid a moment ago must now be rejected.
        const refreshAfterLogout = await api
            .post("/api/v1/members/refresh-token")
            .set("Cookie", [refreshCookie]);
        expect(refreshAfterLogout.status).toBe(401);
    });
});

describe("POST /api/v1/members/complete-profile", () => {
    it("requires authentication", async () => {
        const res = await api.post("/api/v1/members/complete-profile").send({});
        expect(res.status).toBe(401);
    });

    it("rejects an authenticated request missing the required fields", async () => {
        const payload = newUser();
        await api.post("/api/v1/members/register-user").send(payload);
        const loginRes = await api
            .post("/api/v1/members/login-user")
            .send({ uemail: payload.uemail, upassword: payload.upassword });
        const accessCookie = extractCookie(loginRes, "UaccessToken");

        // No file attached and no body fields — should fail multer's
        // "file required" check or validation, never reach the DB update.
        const res = await api.post("/api/v1/members/complete-profile").set("Cookie", [accessCookie]).send({});

        expect(res.status).toBe(400);
    });
});
