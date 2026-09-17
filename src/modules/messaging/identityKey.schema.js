/**
 * PUBLIC key material only — never a private key, never anything that
 * could decrypt a message. This is exactly the data a Signal-Protocol-
 * style key directory server is supposed to hold: enough for another
 * client to establish a session with this account, and nothing more.
 * Private keys are generated and stored client-side and never leave
 * the device — the server has no way to see them, by design.
 *
 * Shared between the User and Hof schemas via Mongoose's spread-into-
 * schema pattern, so the two don't define this identically twice.
 */
export const identityKeyFields = {
    // Base64-encoded Curve25519 public identity key, generated client-side.
    identityKey: {
        type: String,
    },
    // Signal Protocol registration ID, client-generated.
    registrationId: {
        type: Number,
    },
    signedPreKey: {
        keyId: { type: Number },
        publicKey: { type: String }, // base64
        // Signature over publicKey using this account's identity key
        // (XEdDSA over Curve25519, per the Signal spec). Stored as
        // supplied by the client; NOT verified server-side yet — that
        // requires either the official libsignal-client library or a
        // careful from-scratch XEdDSA implementation, and shipping a
        // check that looks like verification without actually being
        // cryptographically sound would be worse than no check at all.
        // See docs/messaging.md.
        signature: { type: String },
    },
    signedPreKeyUpdatedAt: {
        type: Date,
    },
};
