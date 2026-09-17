import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

// URL params use lowercase "user"/"hof" (matches the rest of this app's
// convention — see verification's revoke routes); transformed here to
// the capitalized "User"/"Hof" the Mongoose refPath fields actually use.
const accountTypeParam = z.enum(["user", "hof"]).transform((value) => (value === "hof" ? "Hof" : "User"));

export const registerKeysSchema = z.object({
    body: z.object({
        identityKey: z.string().min(1, "identityKey is required"),
        registrationId: z.number().int().nonnegative(),
        signedPreKey: z.object({
            keyId: z.number().int().nonnegative(),
            publicKey: z.string().min(1),
            signature: z.string().min(1),
        }),
        // A batch upload of one-time prekeys — the client is expected to
        // periodically top these up as the server hands them out.
        oneTimePreKeys: z
            .array(
                z.object({
                    keyId: z.number().int().nonnegative(),
                    publicKey: z.string().min(1),
                })
            )
            .min(1, "At least one one-time prekey is required")
            .max(200, "Too many one-time prekeys in a single batch"),
    }),
});

export const fetchPreKeyBundleSchema = z.object({
    params: z.object({
        accountType: accountTypeParam,
        accountId: objectId,
    }),
});

export const sendMessageSchema = z.object({
    body: z.object({
        recipientType: z.enum(["user", "hof"]).transform((value) => (value === "hof" ? "Hof" : "User")),
        recipientId: objectId,
        // Opaque to this server — never parsed or inspected past "is it
        // a non-empty string".
        ciphertext: z.string().min(1, "ciphertext is required"),
        // 1 = SignalMessage (established session), 3 = PreKeySignalMessage
        // (first message of a new session) — see message.model.js.
        messageType: z.union([z.literal(1), z.literal(3)]),
    }),
});

export const conversationSchema = z.object({
    params: z.object({
        withAccountType: accountTypeParam,
        withAccountId: objectId,
    }),
    query: z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(50),
    }),
});

export const markReadSchema = z.object({
    params: z.object({
        messageId: objectId,
    }),
});
