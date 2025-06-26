// middlewares/verifyEmail.middleware.js
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { Hof } from "../models/hof.models.js";

export const requireEmailVerification = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.hof?._id;
        const role = req.user ? 'user' : 'hof';
        
        if (!userId) {
            return res.status(401).json(
                new ApiResponse(401, null, "Authentication required")
            );
        }
        
        // Determine which model to use
        const Model = role === 'hof' ? Hof : User;
        
        const user = await Model.findById(userId);
        
        if (!user) {
            return res.status(404).json(
                new ApiResponse(404, null, "User not found")
            );
        }
        
        if (!user.isEmailVerified) {
            return res.status(403).json(
                new ApiResponse(403, { needsVerification: true }, "Email verification required")
            );
        }
        
        next();
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, null, `Verification check failed: ${error.message}`)
        );
    }
};