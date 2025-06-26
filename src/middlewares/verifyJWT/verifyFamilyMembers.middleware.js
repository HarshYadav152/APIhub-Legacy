import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Family } from "../../models/family.models.js";
import { User } from "../../models/user.models.js";

export const verifyFamilyMember = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { familyId } = req.params;

        // If familyId is not provided in params, try to get it from the user's document
        let targetFamilyId = familyId;
        if (!targetFamilyId) {
            const user = await User.findById(userId);
            targetFamilyId = user?.family;
            
            if (!targetFamilyId) {
                return res.status(400).json(
                    new ApiResponse(400, null, "No family specified or user doesn't belong to any family")
                );
            }
        }

        // Find the family
        const family = await Family.findById(targetFamilyId);
        if (!family) {
            return res.status(404).json(
                new ApiResponse(404, null, "Family not found")
            );
        }

        // Check if user is a member of this family
        const isMember = family.hasMember(userId);
        if (!isMember) {
            return res.status(403).json(
                new ApiResponse(403, null, "You are not a member of this family")
            );
        }

        // Add family to request for controllers to use
        req.family = family;
        next();
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, null, `Access verification failed: ${error.message}`)
        );
    }
});