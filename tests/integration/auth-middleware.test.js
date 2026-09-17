import { describe, it, expect } from "@jest/globals";
import jwt from "jsonwebtoken";
import { api } from "../helpers/appWithMockedQueue.js";

describe("verifyAuth middleware", () => {
    it("rejects a request with no token at all", async () => {
        const res = await api.get("/api/v1/verify/status");
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/missing/i);
    });

    it("rejects a malformed / garbage token", async () => {
        const res = await api.get("/api/v1/verify/status").set("Authorization", "Bearer not-a-real-jwt");
        expect(res.status).toBe(401);
    });

    it("rejects a token signed with the wrong secret", async () => {
        const bogusToken = jwt.sign(
            { _id: "507f1f77bcf86cd799439011", accountType: "user" },
            "wrong-secret",
            {
                expiresIn: "15m",
            }
        );

        const res = await api.get("/api/v1/verify/status").set("Authorization", `Bearer ${bogusToken}`);
        expect(res.status).toBe(401);
    });

    it("rejects an expired token with a specific message", async () => {
        const expiredToken = jwt.sign(
            { _id: "507f1f77bcf86cd799439011", accountType: "user" },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: -10 } // already expired
        );

        const res = await api.get("/api/v1/verify/status").set("Authorization", `Bearer ${expiredToken}`);
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/expired/i);
    });

    it("rejects a well-formed token for an account that no longer exists", async () => {
        const tokenForGhostAccount = jwt.sign(
            { _id: "507f1f77bcf86cd799439011", accountType: "user" },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "15m" }
        );

        const res = await api
            .get("/api/v1/verify/status")
            .set("Authorization", `Bearer ${tokenForGhostAccount}`);
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/not found/i);
    });
});
