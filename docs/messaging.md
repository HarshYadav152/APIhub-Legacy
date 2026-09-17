# Messaging architecture

This backend implements the **server-side half** of a Signal-Protocol-style
end-to-end encrypted messaging system: a key directory and an opaque
message relay. It deliberately does **not**, and architecturally
**should not**, implement the cryptographic protocol itself.

## Why the server doesn't do the crypto

End-to-end encryption means only the two communicating clients can ever
read a message — not the server in between. That's not a policy choice,
it's the definition. Concretely:

- The Signal Protocol's session state machine — identity keys, X3DH key
  agreement, the Double Ratchet, per-message encrypt/decrypt — has to run
  on the **client** (the mobile app or web frontend), using a Signal
  Protocol client library there.
- If this Express backend ran that logic instead, it would necessarily
  have access to session keys and plaintext at some point, which would
  make the system regular server-side encryption with extra steps, not
  end-to-end encryption.

So the backend's job here is narrower, and everything in
`src/modules/messaging/` reflects that:

| Concern | Where it lives |
|---|---|
| Generate identity keys, prekeys | Client (out of scope for this repo) |
| Publish public keys so others can find you | `POST /messaging/keys` |
| Fetch someone's prekey bundle to start a session | `GET /messaging/keys/:accountType/:accountId` |
| X3DH key agreement | Client |
| Double Ratchet encrypt/decrypt | Client |
| Store/relay the resulting ciphertext | `POST /messaging/messages`, `GET /messaging/messages/:withAccountType/:withAccountId` |
| Real-time delivery push | Socket.IO (`src/realtime/socket.service.js`) |

The `ciphertext` field on every message is opaque as far as this codebase
is concerned — no controller, service, or model in this repo parses,
inspects, or could decrypt it. Only `identityKey`, `signedPreKey.publicKey`,
and one-time prekey `publicKey` values are ever stored — all public key
material, useless to an attacker without the matching private key, which
never leaves the client.

## What's genuinely not done yet

**Signed prekey signature verification.** Signal's prekey signing scheme
is XEdDSA over Curve25519 — a construction Signal built specifically to
let a Curve25519 key be used for both ECDH and signing. Node's built-in
`crypto` module doesn't verify this natively. Correctly verifying it
requires either the official `@signalapp/libsignal-client` library or a
careful, from-scratch XEdDSA implementation — and shipping something that
*looks* like signature verification without being cryptographically sound
would be worse than no check at all, so `signedPreKey.signature` is
currently stored as supplied by the client and not verified server-side.
This means a compromised or malicious client could publish a signed
prekey with an invalid signature; a correctly-implemented receiving
client's Signal library would still catch this at session-establishment
time (verification also happens client-side, redundantly, in a real
Signal-Protocol client), but the backend isn't providing defense-in-depth
here yet. Wiring in real verification is a well-scoped, specific follow-up.

**Delivery receipts.** `Message.deliveredAt` exists on the schema but
nothing sets it. Real-time push (`message:new` over the socket) is
best-effort; `readAt` (set via `PATCH /messaging/messages/:id/read`) is
the only receipt actually tracked right now. A proper delivered-receipt
would need an explicit client ACK over the socket connection.

**Group messaging.** Everything here is 1:1 between two accounts. Signal's
group messaging (sender keys) is a materially different protocol and
isn't attempted.

## Scope: within a family

Messaging is authorized against the existing family-membership model —
two accounts can message each other only if they're both members of the
same family (the HOF and every added member). This isn't a Signal
Protocol concept; it's this app's own domain rule, enforced in
`messaging.service.js`'s `assertSameFamily`, resolved entirely from the
caller's own authenticated identity (never from a client-supplied family
ID).

## If you're integrating a client against this

1. Generate an identity key pair, a signed prekey, and a batch of
   one-time prekeys client-side, using a real Signal Protocol client
   library (e.g. `libsignal-client`'s bindings for your platform, or an
   equivalent).
2. `POST /messaging/keys` to publish the public halves.
3. To message someone for the first time: `GET
   /messaging/keys/:accountType/:accountId` for their bundle, run X3DH
   client-side to establish a session, encrypt your first message
   (`messageType: 3`), `POST /messaging/messages`.
4. For subsequent messages in an established session: encrypt with the
   Double Ratchet (`messageType: 1`), `POST /messaging/messages`.
5. Listen for `message:new` on a Socket.IO connection authenticated with
   your access token (`socket.handshake.auth.token`) for real-time
   delivery, and/or poll `GET
   /messaging/messages/:withAccountType/:withAccountId` for history.
6. Decrypt entirely client-side. The server never sees your plaintext.
