import { Family } from "../family/family.model.js";
import { User } from "../users/user.model.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Resolves the family an account belongs to, purely from that
 * account's own identity — never from a client-supplied family ID.
 * A HOF's membership is "are you the head of this family"
 * (Family.head_of_family); a User's is "are you in the members array".
 * These are checked differently because they're genuinely different
 * relationships in the schema, not because of any special-casing.
 */
const getAccountFamily = async (accountType, accountId) => {
    if (accountType === "Hof") {
        const family = await Family.findOne({ head_of_family: accountId });
        if (!family) {
            throw new ApiError(404, "You have not created a family yet");
        }
        return family;
    }

    const user = await User.findById(accountId).select("family");
    if (!user?.family) {
        throw new ApiError(404, "You are not associated with any family");
    }

    const family = await Family.findById(user.family);
    if (!family) {
        throw new ApiError(404, "Family not found");
    }
    return family;
};

const isMemberOfFamily = (family, accountType, accountId) => {
    if (accountType === "Hof") {
        return family.head_of_family.toString() === accountId.toString();
    }
    return family.hasMember(accountId);
};

/**
 * Authorizes messaging/key-bundle access between two accounts: resolves
 * the requester's own family server-side (never trusting a client-
 * supplied family ID), then confirms the target account is a member of
 * that same family. Throws 404/403 otherwise. Returns the shared
 * Family document for callers that need it (e.g. to stamp `family` on
 * a new Message).
 */
export const assertSameFamily = async (requester, target) => {
    const family = await getAccountFamily(requester.type, requester.id);

    if (!isMemberOfFamily(family, target.type, target.id)) {
        throw new ApiError(403, "You can only message members of your own family");
    }

    return family;
};
