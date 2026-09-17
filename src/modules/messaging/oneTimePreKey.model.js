import mongoose from "mongoose";

/**
 * One-time prekeys exist to give every new session its own ephemeral
 * key (part of what makes X3DH provide forward secrecy for the first
 * message). A client uploads a batch of these; the server hands out
 * (and immediately deletes) exactly one per session-establishment
 * request, atomically, so the same one-time prekey can never be
 * consumed twice even under concurrent requests.
 *
 * accountType/accountId use refPath the same way Message does — see
 * that model for why (messaging works between Users and Hofs, which
 * are different collections, on both the owning and consuming side).
 */
const OneTimePreKeySchema = new mongoose.Schema(
    {
        accountType: {
            type: String,
            required: true,
            enum: ["User", "Hof"],
        },
        accountId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: "accountType",
        },
        keyId: {
            type: Number,
            required: true,
        },
        publicKey: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

OneTimePreKeySchema.index({ accountType: 1, accountId: 1, keyId: 1 }, { unique: true });

export const OneTimePreKey = mongoose.model("OneTimePreKey", OneTimePreKeySchema);
