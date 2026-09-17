import { describe, it, expect } from "@jest/globals";
import { api } from "../helpers/appWithMockedQueue.js";

describe("GET /api/v1/health", () => {
    it("returns 200 and a healthy status when the DB is connected", async () => {
        const res = await api.get("/api/v1/health");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("UP");
        expect(res.body.data.database.isConnected).toBe(true);
    });
});

describe("GET /", () => {
    it("responds with a basic liveness payload", async () => {
        const res = await api.get("/");
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("UP");
    });
});

describe("unknown routes", () => {
    it("returns a consistent 404 JSON shape instead of Express's default page", async () => {
        const res = await api.get("/api/v1/this-route-does-not-exist");

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Route not found/);
    });
});
