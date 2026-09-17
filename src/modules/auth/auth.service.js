import { ApiError } from "../../utils/ApiError.js";
import { hashToken, verifyRefreshToken } from "../../utils/token.utils.js";

/**
 * Refresh-token rotation shared by both the user and HOF auth flows.
 * Only the Mongoose Model differs between the two callers — the actual
 * rotation logic (verify → look up → check the stored hash → issue a
 * new pair → store the new hash) is identical, so it lives here once
 * instead of being copied into both controllers.
 *
 * Rotation-on-use + reuse detection: every refresh invalidates the
 * previous refresh token. If a token is presented that doesn't match
 * the currently-stored hash, it's either expired-and-replaced or has
 * been stolen and already used by someone else — either way we revoke
 * the stored token so both the legitimate holder and an attacker are
 * forced back through login.
 */
export const rotateRefreshToken = async (incomingToken, Model, accountType) => {
    if (!incomingToken) {
        throw new ApiError(401, "Refresh token missing");
    }

    let decoded;
    try {
        decoded = verifyRefreshToken(incomingToken);
    } catch {
        throw new ApiError(401, "Invalid or expired refresh token. Please log in again.");
    }

    if (decoded.accountType !== accountType) {
        throw new ApiError(401, "Refresh token is not valid for this resource");
    }

    const subject = await Model.findById(decoded._id).select("+refreshTokenHash");
    if (!subject) {
        throw new ApiError(401, "Invalid refresh token");
    }

    if (!subject.refreshTokenHash || subject.refreshTokenHash !== hashToken(incomingToken)) {
        subject.refreshTokenHash = undefined;
        await subject.save({ validateBeforeSave: false });
        throw new ApiError(401, "Refresh token has been revoked. Please log in again.");
    }

    const accessToken = subject.generateAccessToken();
    const refreshToken = subject.generateRefreshToken();

    subject.refreshTokenHash = hashToken(refreshToken);
    await subject.save({ validateBeforeSave: false });

    return { subject, accessToken, refreshToken };
};

export const issueTokenPair = async (subject) => {
    const accessToken = subject.generateAccessToken();
    const refreshToken = subject.generateRefreshToken();

    subject.refreshTokenHash = hashToken(refreshToken);
    await subject.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
};

export const revokeRefreshToken = async (subject) => {
    subject.refreshTokenHash = undefined;
    await subject.save({ validateBeforeSave: false });
};
