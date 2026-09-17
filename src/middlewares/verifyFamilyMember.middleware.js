import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Family } from "../modules/family/family.model.js";
import { User } from "../modules/users/user.model.js";

/**
 * Authorization (not authentication) middleware: assumes verifyAuth("user")
 * already ran and set req.user, then checks the user actually belongs to
 * the family being accessed. Kept separate from verifyAuth on purpose —
 * "who are you" and "are you allowed to touch this family" are different
 * concerns, and folding them together was never actually duplicated logic
 * the way verifyMember/verifyHof were.
 */
export const verifyFamilyMember = asyncHandler(async (req, _res, next) => {
    const userId = req.user._id;
    const { familyId } = req.params;

    let targetFamilyId = familyId;
    if (!targetFamilyId) {
        const user = await User.findById(userId);
        targetFamilyId = user?.family;

        if (!targetFamilyId) {
            throw new ApiError(400, "No family specified or user doesn't belong to any family");
        }
    }

    const family = await Family.findById(targetFamilyId);
    if (!family) {
        throw new ApiError(404, "Family not found");
    }

    if (!family.hasMember(userId)) {
        throw new ApiError(403, "You are not a member of this family");
    }

    req.family = family;
    next();
});
