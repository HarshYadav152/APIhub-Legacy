import { describe, it, expect } from "@jest/globals";
import { api, lastOtpSentTo } from "../helpers/appWithMockedQueue.js";

const registerUser = async () => {
    const email = `otp+${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    await api.post("/api/v1/members/register-user").send({
        uname: "Otp Test",
        uemail: email,
        upassword: "correct-horse-battery-staple",
    });
    return email;
};

describe("POST /api/v1/verify/send-otp", () => {
    it("sends an OTP for a registered, unverified user", async () => {
        const email = await registerUser();

        const res = await api.post("/api/v1/verify/send-otp").send({ email, role: "user" });

        expect(res.status).toBe(200);
        expect(res.body.data.otpSent).toBe(true);
        expect(lastOtpSentTo(email)).toMatch(/^\d+$/);
    });

    it("returns 404 for an email that was never registered", async () => {
        const res = await api
            .post("/api/v1/verify/send-otp")
            .send({ email: "ghost@example.com", role: "user" });
        expect(res.status).toBe(404);
    });

    it("rejects a malformed email with 400 before touching the DB", async () => {
        const res = await api.post("/api/v1/verify/send-otp").send({ email: "not-an-email", role: "user" });
        expect(res.status).toBe(400);
    });
});

describe("POST /api/v1/verify/verify-otp", () => {
    it("verifies successfully with the correct OTP", async () => {
        const email = await registerUser();
        await api.post("/api/v1/verify/send-otp").send({ email, role: "user" });
        const otp = lastOtpSentTo(email);

        const res = await api.post("/api/v1/verify/verify-otp").send({ email, otp, role: "user" });

        expect(res.status).toBe(200);
        expect(res.body.data.isVerified).toBe(true);
    });

    it("rejects an incorrect OTP", async () => {
        const email = await registerUser();
        await api.post("/api/v1/verify/send-otp").send({ email, role: "user" });

        const res = await api.post("/api/v1/verify/verify-otp").send({ email, otp: "000000", role: "user" });

        expect(res.status).toBe(400);
    });

    it("short-circuits with 200 when re-sending an OTP to an already-verified account", async () => {
        const email = await registerUser();
        await api.post("/api/v1/verify/send-otp").send({ email, role: "user" });
        const otp = lastOtpSentTo(email);
        await api.post("/api/v1/verify/verify-otp").send({ email, otp, role: "user" });

        const res = await api.post("/api/v1/verify/send-otp").send({ email, role: "user" });

        expect(res.status).toBe(200);
        expect(res.body.data.isVerified).toBe(true);
    });
});
