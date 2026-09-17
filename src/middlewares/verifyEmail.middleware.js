import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../modules/users/user.model.js";
import { Hof } from "../modules/hof/hof.model.js";

/**
 * Gate for routes that should only work once the account's email is
 * verified. Runs after verifyAuth("user"|"hof"), so req.user or req.hof
 * is already set — this just re-fetches to check the current
 * isEmailVerified flag rather than trusting a possibly-stale req object.
 */
export const requireEmailVerification = asyncHandler(async (req, _res, next) => {
    const userId = req.user?._id || req.hof?._id;
    const role = req.user ? "user" : "hof";

    if (!userId) {
        throw new ApiError(401, "Authentication required");
    }

    const Model = role === "hof" ? Hof : User;
    const account = await Model.findById(userId);

    if (!account) {
        throw new ApiError(404, `${role === "hof" ? "HOF" : "User"} not found`);
    }

    if (!account.isEmailVerified) {
        throw new ApiError(403, "Email verification required", [{ needsVerification: true }]);
    }

    next();
});
