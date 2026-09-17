import { User } from "../users/user.model.js";
import { Family } from "../family/family.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

/**
 * A HOF may revoke email verification for a User, but only for someone
 * who is actually a member of the family that HOF heads — previously
 * any authenticated HOF could revoke verification for any email in the
 * system by supplying it in the URL, regardless of family membership.
 */
const revokeMemberVerification = asyncHandler(async (req, res) => {
    const { email } = req.params;
    const hofId = req.hof._id;

    const family = await Family.findOne({ head_of_family: hofId });
    if (!family) {
        throw new ApiError(404, "You have not created a family yet");
    }

    const member = await User.findOne({ email });
    if (!member) {
        throw new ApiError(404, "User not found");
    }

    if (!family.hasMember(member._id)) {
        throw new ApiError(403, "You can only revoke verification for members of your own family");
    }

    member.isEmailVerified = false;
    await member.save();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isVerified: false },
                "Email verification for User has been revoked successfully"
            )
        );
});

/**
 * A HOF may only revoke their own verification — there's no admin role
 * in this app yet to justify letting one HOF revoke another's, and
 * without that, allowing it at all would just reopen the same kind of
 * gap as the member case above, one level up.
 */
const revokeHofVerification = asyncHandler(async (req, res) => {
    const { email } = req.params;

    if (email !== req.hof.hof_email) {
        throw new ApiError(403, "You can only revoke your own verification");
    }

    req.hof.isEmailVerified = false;
    await req.hof.save();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isVerified: false },
                "Email verification for HOF has been revoked successfully"
            )
        );
});

export { revokeMemberVerification, revokeHofVerification };
