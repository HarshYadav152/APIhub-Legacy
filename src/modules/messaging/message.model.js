import mongoose from "mongoose";

/**
 * The server stores and relays `ciphertext` without ever being able to
 * read it — that's the entire point. It's an opaque, client-encrypted
 * blob as far as this schema and every controller that touches it are
 * concerned; nothing here parses or inspects its contents.
 *
 * accountType/accountId (on both sender and recipient) use Mongoose's
 * dynamic refPath so a message can reference either a User or a Hof —
 * messaging happens between any two members of the same family,
 * including the HOF, and those two roles are different collections.
 */
const MessageSchema = new mongoose.Schema(
    {
        family: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Family",
            required: true,
        },
        senderType: {
            type: String,
            required: true,
            enum: ["User", "Hof"],
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: "senderType",
        },
        recipientType: {
            type: String,
            required: true,
            enum: ["User", "Hof"],
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: "recipientType",
        },
        // Opaque, base64-encoded ciphertext produced client-side. Never
        // decrypted, parsed, or inspected server-side.
        ciphertext: {
            type: String,
            required: true,
        },
        // Signal Protocol message envelope type — the server needs this
        // to relay it faithfully (a client's Signal library uses it to
        // pick the right decrypt path), not to interpret it.
        // 3 = PreKeySignalMessage (first message of a new session),
        // 1 = SignalMessage (an established session's ordinary message).
        messageType: {
            type: Number,
            required: true,
            enum: [1, 3],
        },
        deliveredAt: {
            type: Date,
            // Not populated by any code path yet — real delivery-receipt
            // tracking (vs. best-effort real-time push) would need an
            // explicit client ACK over the socket, which is out of scope
            // for this phase. Left on the schema since it's an obvious
            // next step, not because anything sets it today.
        },
        readAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

MessageSchema.index({ family: 1, senderType: 1, sender: 1, recipientType: 1, recipient: 1, createdAt: -1 });

export const Message = mongoose.model("Message", MessageSchema);
