import { User } from "../users/user.model.js";
import { Hof } from "../hof/hof.model.js";
import { OneTimePreKey } from "./oneTimePreKey.model.js";
import { assertSameFamily } from "./messaging.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const modelFor = (accountType) => (accountType === "Hof" ? Hof : User);

/**
 * Publishes (or replaces) this account's public key material and tops
 * up its stock of one-time prekeys. Called once at first setup and
 * again periodically as one-time prekeys get consumed by other clients
 * establishing sessions — this server has no way to know when a client
 * is running low other than the client telling it.
 */
const registerKeys = asyncHandler(async (req, res) => {
    const { type: accountType, id: accountId } = req.account;
    const { identityKey, registrationId, signedPreKey, oneTimePreKeys } = req.body;

    await modelFor(accountType).findByIdAndUpdate(accountId, {
        identityKey,
        registrationId,
        signedPreKey,
        signedPreKeyUpdatedAt: new Date(),
    });

    const docs = oneTimePreKeys.map((key) => ({
        accountType,
        accountId,
        keyId: key.keyId,
        publicKey: key.publicKey,
    }));

    let insertedCount = 0;
    try {
        const inserted = await OneTimePreKey.insertMany(docs, { ordered: false });
        insertedCount = inserted.length;
    } catch (error) {
        // ordered:false means a duplicate keyId (the client re-sent one
        // already on file — caught by the unique index) doesn't abort
        // the rest of the batch; Mongoose surfaces what did succeed via
        // insertedDocs. Anything not in there was skipped as a duplicate,
        // not lost.
        insertedCount = error.insertedDocs?.length ?? 0;
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { keysRegistered: true, oneTimePreKeysAdded: insertedCount },
                "Keys registered successfully"
            )
        );
});

/**
 * Returns everything another account's client needs to establish a new
 * Signal Protocol session with them (X3DH) — their identity key, their
 * current signed prekey, and one one-time prekey, atomically removed
 * so it can never be handed out twice. `oneTimePreKey` can legitimately
 * be null if that account's supply is exhausted — X3DH still works
 * without one, just with slightly weaker forward secrecy for the first
 * message; a real client should prompt that account to top up soon.
 */
const getPreKeyBundle = asyncHandler(async (req, res) => {
    const { accountType, accountId } = req.params;

    await assertSameFamily(req.account, { type: accountType, id: accountId });

    const target = await modelFor(accountType)
        .findById(accountId)
        .select("identityKey registrationId signedPreKey");

    if (!target || !target.identityKey || !target.signedPreKey?.publicKey) {
        throw new ApiError(404, "This account has not published messaging keys yet");
    }

    const oneTimePreKey = await OneTimePreKey.findOneAndDelete(
        { accountType, accountId },
        { sort: { createdAt: 1 } }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                identityKey: target.identityKey,
                registrationId: target.registrationId,
                signedPreKey: target.signedPreKey,
                oneTimePreKey: oneTimePreKey
                    ? { keyId: oneTimePreKey.keyId, publicKey: oneTimePreKey.publicKey }
                    : null,
            },
            "Prekey bundle retrieved"
        )
    );
});

export { registerKeys, getPreKeyBundle };
