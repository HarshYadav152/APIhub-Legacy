import { describe, it, expect } from "@jest/globals";
import { api, lastOtpSentTo } from "../helpers/appWithMockedQueue.js";
import { extractCookie } from "../helpers/cookies.js";

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createVerifiedHof = async () => {
    const email = `hof+${unique()}@example.com`;
    const payload = { name: "Head Of Family", email, password: "correct-horse-battery-staple" };

    const registerRes = await api.post("/api/v1/hof/register").send(payload);
    await api.post("/api/v1/verify/send-otp").send({ email, role: "hof" });
    const otp = lastOtpSentTo(email);
    await api.post("/api/v1/verify/verify-otp").send({ email, otp, role: "hof" });

    const loginRes = await api.post("/api/v1/hof/entry").send({ email, password: payload.password });
    return {
        hofId: registerRes.body.data._id,
        accessCookie: extractCookie(loginRes, "HaccessToken"),
        accessToken: loginRes.body.data.accessToken,
        email,
    };
};

const createUser = async () => {
    const email = `member+${unique()}@example.com`;
    const password = "correct-horse-battery-staple";
    const registerRes = await api
        .post("/api/v1/members/register-user")
        .send({ uname: "Family Member", uemail: email, upassword: password });

    const loginRes = await api
        .post("/api/v1/members/login-user")
        .send({ uemail: email, upassword: password });

    return {
        userId: registerRes.body.data.userId,
        accessCookie: extractCookie(loginRes, "UaccessToken"),
        accessToken: loginRes.body.data.accessToken,
        email,
    };
};

/** Sets up a family with one HOF and one member, both with cookies/tokens ready. */
const setupFamilyWithMember = async () => {
    const hof = await createVerifiedHof();
    await api
        .post("/api/v1/family/create")
        .set("Cookie", [hof.accessCookie])
        .send({ fname: "The Smiths", fdesc: "A family", fpicture: "pic.jpg", estd: "2020-01-01" });

    const member = await createUser();
    await api.post(`/api/v1/family/add-member/${member.userId}`).set("Cookie", [hof.accessCookie]);

    return { hof, member };
};

const sampleKeyPayload = (seed) => ({
    identityKey: `identity-key-${seed}`,
    registrationId: 12345,
    signedPreKey: { keyId: 1, publicKey: `signed-prekey-${seed}`, signature: `sig-${seed}` },
    oneTimePreKeys: [
        { keyId: 1, publicKey: `otk-${seed}-1` },
        { keyId: 2, publicKey: `otk-${seed}-2` },
    ],
});

describe("POST /api/v1/messaging/keys", () => {
    it("registers keys for a user", async () => {
        const { member } = await setupFamilyWithMember();
        const res = await api
            .post("/api/v1/messaging/keys")
            .set("Authorization", `Bearer ${member.accessToken}`)
            .send(sampleKeyPayload("u1"));

        expect(res.status).toBe(200);
        expect(res.body.data.keysRegistered).toBe(true);
        expect(res.body.data.oneTimePreKeysAdded).toBe(2);
    });

    it("registers keys for a HOF too (role-agnostic auth)", async () => {
        const { hof } = await setupFamilyWithMember();
        const res = await api
            .post("/api/v1/messaging/keys")
            .set("Authorization", `Bearer ${hof.accessToken}`)
            .send(sampleKeyPayload("h1"));

        expect(res.status).toBe(200);
        expect(res.body.data.keysRegistered).toBe(true);
    });

    it("rejects a payload missing required key material", async () => {
        const { member } = await setupFamilyWithMember();
        const res = await api
            .post("/api/v1/messaging/keys")
            .set("Authorization", `Bearer ${member.accessToken}`)
            .send({ identityKey: "x" });

        expect(res.status).toBe(400);
    });
});

describe("GET /api/v1/messaging/keys/:accountType/:accountId", () => {
    it("fetches a family member's prekey bundle, consuming one one-time prekey", async () => {
        const { hof, member } = await setupFamilyWithMember();
        await api
            .post("/api/v1/messaging/keys")
            .set("Authorization", `Bearer ${member.accessToken}`)
            .send(sampleKeyPayload("bundle-test"));

        const res = await api
            .get(`/api/v1/messaging/keys/user/${member.userId}`)
            .set("Authorization", `Bearer ${hof.accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.identityKey).toBe("identity-key-bundle-test");
        expect(res.body.data.oneTimePreKey).not.toBeNull();
    });

    it("consumes one-time prekeys atomically — the same key is never handed out twice", async () => {
        const { hof, member } = await setupFamilyWithMember();
        await api
            .post("/api/v1/messaging/keys")
            .set("Authorization", `Bearer ${member.accessToken}`)
            .send({ ...sampleKeyPayload("atomic"), oneTimePreKeys: [{ keyId: 1, publicKey: "only-one" }] });

        const first = await api
            .get(`/api/v1/messaging/keys/user/${member.userId}`)
            .set("Authorization", `Bearer ${hof.accessToken}`);
        const second = await api
            .get(`/api/v1/messaging/keys/user/${member.userId}`)
            .set("Authorization", `Bearer ${hof.accessToken}`);

        expect(first.body.data.oneTimePreKey.publicKey).toBe("only-one");
        // Supply exhausted after one fetch — X3DH still works without one,
        // just with slightly weaker forward secrecy for the first message.
        expect(second.body.data.oneTimePreKey).toBeNull();
    });

    it("rejects fetching a bundle for someone outside the caller's family", async () => {
        const { hof } = await setupFamilyWithMember();
        const outsider = await createUser(); // never added to this family

        const res = await api
            .get(`/api/v1/messaging/keys/user/${outsider.userId}`)
            .set("Authorization", `Bearer ${hof.accessToken}`);

        expect(res.status).toBe(403);
    });

    it("returns 404 if the target hasn't published keys yet", async () => {
        const { hof, member } = await setupFamilyWithMember();

        const res = await api
            .get(`/api/v1/messaging/keys/user/${member.userId}`)
            .set("Authorization", `Bearer ${hof.accessToken}`);

        expect(res.status).toBe(404);
    });
});

describe("messaging between family members", () => {
    const sendCiphertext = async (from, to) =>
        api.post("/api/v1/messaging/messages").set("Authorization", `Bearer ${from.accessToken}`).send({
            recipientType: to.recipientType,
            recipientId: to.recipientId,
            ciphertext: "opaque-ciphertext-blob",
            messageType: 3,
        });

    it("sends a message from a HOF to a member", async () => {
        const { hof, member } = await setupFamilyWithMember();

        const res = await sendCiphertext(hof, { recipientType: "user", recipientId: member.userId });

        expect(res.status).toBe(201);
        expect(res.body.data.messageId).toBeDefined();
    });

    it("stores ciphertext opaquely — round-trips byte-for-byte, unexamined", async () => {
        const { hof, member } = await setupFamilyWithMember();
        await sendCiphertext(hof, { recipientType: "user", recipientId: member.userId });

        const res = await api
            .get(`/api/v1/messaging/messages/hof/${hof.hofId}`)
            .set("Authorization", `Bearer ${member.accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.messages).toHaveLength(1);
        expect(res.body.data.messages[0].ciphertext).toBe("opaque-ciphertext-blob");
        expect(res.body.data.messages[0].messageType).toBe(3);
    });

    it("paginates conversation history", async () => {
        const { hof, member } = await setupFamilyWithMember();
        for (let i = 0; i < 3; i++) {
            await sendCiphertext(hof, { recipientType: "user", recipientId: member.userId });
        }

        const res = await api
            .get(`/api/v1/messaging/messages/hof/${hof.hofId}?page=1&limit=2`)
            .set("Authorization", `Bearer ${member.accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.messages).toHaveLength(2);
        expect(res.body.data.pagination).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
    });

    it("rejects sending to someone outside the caller's family", async () => {
        const { hof } = await setupFamilyWithMember();
        const outsider = await createUser();

        const res = await sendCiphertext(hof, { recipientType: "user", recipientId: outsider.userId });

        expect(res.status).toBe(403);
    });

    it("marks a message as read only by its actual recipient", async () => {
        const { hof, member } = await setupFamilyWithMember();
        const sendRes = await sendCiphertext(hof, { recipientType: "user", recipientId: member.userId });
        const messageId = sendRes.body.data.messageId;

        // The sender (hof) is not the recipient — should not be able to
        // mark their own sent message as read.
        const wrongReader = await api
            .patch(`/api/v1/messaging/messages/${messageId}/read`)
            .set("Authorization", `Bearer ${hof.accessToken}`);
        expect(wrongReader.status).toBe(404);

        const rightReader = await api
            .patch(`/api/v1/messaging/messages/${messageId}/read`)
            .set("Authorization", `Bearer ${member.accessToken}`);
        expect(rightReader.status).toBe(200);
        expect(rightReader.body.data.readAt).toBeDefined();
    });
});
