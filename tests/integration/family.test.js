import { describe, it, expect } from "@jest/globals";
import { api, lastOtpSentTo } from "../helpers/appWithMockedQueue.js";
import { extractCookie } from "../helpers/cookies.js";

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Registers, verifies, and logs in a HOF. Returns the access-token cookie. */
const createVerifiedHof = async () => {
    const email = `hof+${unique()}@example.com`;
    const payload = { name: "Head Of Family", email, password: "correct-horse-battery-staple" };

    await api.post("/api/v1/hof/register").send(payload);
    await api.post("/api/v1/verify/send-otp").send({ email, role: "hof" });
    const otp = lastOtpSentTo(email);
    await api.post("/api/v1/verify/verify-otp").send({ email, otp, role: "hof" });

    const loginRes = await api.post("/api/v1/hof/entry").send({ email, password: payload.password });
    return { accessCookie: extractCookie(loginRes, "HaccessToken"), email };
};

/** Registers a user (unverified is fine — addMembers doesn't require it). Returns { userId, email }. */
const createUser = async () => {
    const email = `member+${unique()}@example.com`;
    const res = await api.post("/api/v1/members/register-user").send({
        uname: "Family Member",
        uemail: email,
        upassword: "correct-horse-battery-staple",
    });
    return { userId: res.body.data.userId, email };
};

describe("POST /api/v1/family/create", () => {
    it("requires authentication", async () => {
        const res = await api.post("/api/v1/family/create").send({});
        expect(res.status).toBe(401);
    });

    it("requires the HOF's email to be verified", async () => {
        const email = `unverified+${unique()}@example.com`;
        await api
            .post("/api/v1/hof/register")
            .send({ name: "X", email, password: "correct-horse-battery-staple" });
        const loginRes = await api
            .post("/api/v1/hof/entry")
            .send({ email, password: "correct-horse-battery-staple" });
        const accessCookie = extractCookie(loginRes, "HaccessToken");

        const res = await api
            .post("/api/v1/family/create")
            .set("Cookie", [accessCookie])
            .send({ fname: "The Smiths", fdesc: "desc", fpicture: "pic.jpg", estd: "2020-01-01" });

        expect(res.status).toBe(403);
    });

    it("creates a family for a verified HOF", async () => {
        const { accessCookie } = await createVerifiedHof();

        const res = await api
            .post("/api/v1/family/create")
            .set("Cookie", [accessCookie])
            .send({ fname: "The Smiths", fdesc: "A family", fpicture: "pic.jpg", estd: "2020-01-01" });

        expect(res.status).toBe(201);
        expect(res.body.data.familyCreated).toBe(true);
        expect(res.body.data.memberCount).toBe(1);
    });

    it("rejects creating a second family for the same HOF", async () => {
        const { accessCookie } = await createVerifiedHof();
        const payload = { fname: "The Smiths", fdesc: "A family", fpicture: "pic.jpg", estd: "2020-01-01" };

        await api.post("/api/v1/family/create").set("Cookie", [accessCookie]).send(payload);
        const res = await api.post("/api/v1/family/create").set("Cookie", [accessCookie]).send(payload);

        expect(res.status).toBe(409);
    });

    it("rejects an invalid payload with 400", async () => {
        const { accessCookie } = await createVerifiedHof();

        const res = await api.post("/api/v1/family/create").set("Cookie", [accessCookie]).send({ fname: "" });

        expect(res.status).toBe(400);
    });
});

describe("family membership", () => {
    const setupFamily = async () => {
        const hof = await createVerifiedHof();
        await api
            .post("/api/v1/family/create")
            .set("Cookie", [hof.accessCookie])
            .send({ fname: "The Smiths", fdesc: "A family", fpicture: "pic.jpg", estd: "2020-01-01" });
        return hof;
    };

    it("adds an existing user as a member", async () => {
        const { accessCookie } = await setupFamily();
        const { userId } = await createUser();

        const res = await api.post(`/api/v1/family/add-member/${userId}`).set("Cookie", [accessCookie]);

        expect(res.status).toBe(200);
        expect(res.body.data.membersAdded).toBe(true);
        expect(res.body.data.memberCount).toBe(2); // HOF + new member
    });

    it("rejects adding a userId that isn't a valid ObjectId, before touching the DB", async () => {
        const { accessCookie } = await setupFamily();

        const res = await api.post("/api/v1/family/add-member/not-a-valid-id").set("Cookie", [accessCookie]);

        expect(res.status).toBe(400);
    });

    it("reports membersAdded: false when adding someone already a member", async () => {
        const { accessCookie } = await setupFamily();
        const { userId } = await createUser();

        await api.post(`/api/v1/family/add-member/${userId}`).set("Cookie", [accessCookie]);
        const res = await api.post(`/api/v1/family/add-member/${userId}`).set("Cookie", [accessCookie]);

        expect(res.status).toBe(200);
        expect(res.body.data.membersAdded).toBe(false);
    });

    it("removes a member and reflects the drop in the member count", async () => {
        const { accessCookie } = await setupFamily();
        const { userId } = await createUser();
        await api.post(`/api/v1/family/add-member/${userId}`).set("Cookie", [accessCookie]);

        const removeRes = await api
            .post(`/api/v1/family/remove-member/${userId}`)
            .set("Cookie", [accessCookie]);
        expect(removeRes.status).toBe(200);
        expect(removeRes.body.data.memberRemoved).toBe(true);

        const countRes = await api.get("/api/v1/family/total-member").set("Cookie", [accessCookie]);
        expect(countRes.body.data.memberCount).toBe(1); // back down to just the HOF
    });

    it("marks a newly added member's isActive as true in the member list (was silently broken)", async () => {
        const { accessCookie } = await setupFamily();
        const { userId } = await createUser();
        await api.post(`/api/v1/family/add-member/${userId}`).set("Cookie", [accessCookie]);

        const res = await api.get("/api/v1/family/get-all-members").set("Cookie", [accessCookie]);
        const addedMember = res.body.data.members.find((m) => m.id === userId);

        expect(addedMember).toBeDefined();
        expect(addedMember.isActive).toBe(true);
        expect(addedMember).toHaveProperty("relationship");
    });
});

describe("GET /api/v1/family/get-all-members (pagination)", () => {
    it("paginates the member list", async () => {
        const hof = await createVerifiedHof();
        await api
            .post("/api/v1/family/create")
            .set("Cookie", [hof.accessCookie])
            .send({ fname: "Big Family", fdesc: "desc", fpicture: "pic.jpg", estd: "2020-01-01" });

        // HOF is already member #1; add 3 more.
        for (let i = 0; i < 3; i++) {
            const { userId } = await createUser();
            await api.post(`/api/v1/family/add-member/${userId}`).set("Cookie", [hof.accessCookie]);
        }

        const res = await api
            .get("/api/v1/family/get-all-members?page=1&limit=2")
            .set("Cookie", [hof.accessCookie]);

        expect(res.status).toBe(200);
        expect(res.body.data.members.length).toBe(2);
        expect(res.body.data.pagination).toMatchObject({
            page: 1,
            limit: 2,
            totalMembers: 4,
            totalPages: 2,
            hasNextPage: true,
            hasPrevPage: false,
        });
    });
});

describe("verification revoke authorization", () => {
    it("lets a HOF revoke verification for their own family member", async () => {
        const { accessCookie } = await createVerifiedHof();
        await api
            .post("/api/v1/family/create")
            .set("Cookie", [accessCookie])
            .send({ fname: "The Smiths", fdesc: "desc", fpicture: "pic.jpg", estd: "2020-01-01" });

        const { userId, email } = await createUser();
        await api.post(`/api/v1/family/add-member/${userId}`).set("Cookie", [accessCookie]);

        const res = await api.post(`/api/v1/verify/revoke-member/${email}`).set("Cookie", [accessCookie]);
        expect(res.status).toBe(200);
    });

    it("rejects revoking verification for a user NOT in the calling HOF's family", async () => {
        const { accessCookie } = await createVerifiedHof();
        await api
            .post("/api/v1/family/create")
            .set("Cookie", [accessCookie])
            .send({ fname: "The Smiths", fdesc: "desc", fpicture: "pic.jpg", estd: "2020-01-01" });

        // A user that exists but was never added to this HOF's family.
        const { email: outsiderEmail } = await createUser();

        const res = await api
            .post(`/api/v1/verify/revoke-member/${outsiderEmail}`)
            .set("Cookie", [accessCookie]);
        expect(res.status).toBe(403);
    });

    it("lets a HOF revoke their own verification", async () => {
        const { accessCookie, email } = await createVerifiedHof();
        const res = await api.post(`/api/v1/verify/revoke-hof/${email}`).set("Cookie", [accessCookie]);
        expect(res.status).toBe(200);
    });

    it("rejects a HOF revoking a different HOF's verification", async () => {
        const { accessCookie } = await createVerifiedHof();
        const otherHof = await createVerifiedHof();

        const res = await api
            .post(`/api/v1/verify/revoke-hof/${otherHof.email}`)
            .set("Cookie", [accessCookie]);
        expect(res.status).toBe(403);
    });
});
