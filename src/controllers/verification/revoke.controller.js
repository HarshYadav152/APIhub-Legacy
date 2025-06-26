import { Hof } from "../../models/hof.models.js";
import { User } from "../../models/user.models.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const revokeVerification = asyncHandler(async (req, res) => {
    const { email, role } = req.params;
    let searchField = 'email';
    if (role === 'hof') {
        searchField = 'hof_email'; // Use this if your HOF model uses a different field name
    }

    if (!email) {
        return res.status(400).json(
            new ApiResponse(400, null, "Email is required")
        );
    }

    // Determine which model to use
    const Model = role === 'hof' ? Hof : User;

    // Create a dynamic query
    const query = {};
    query[searchField] = email;

    try {
        const user = await Model.findOne(query)

        if (!user) {
            return res.status(404).json(
                new ApiResponse(404, null, `${role === 'hof' ? 'Hof' : 'User'} not found`)
            );
        }
        user.isVerified = false;
        await user.save();

        return res.status(200).json(
            new ApiResponse(
                200,
                { isVerified: false },
                `Email verification for ${role === 'hof' ? 'Hof' : 'User'} has been revoked successfully`
            )
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, null, `Error revoking verification: ${error.message}`)
        );
    }
})

export {
    revokeVerification
}