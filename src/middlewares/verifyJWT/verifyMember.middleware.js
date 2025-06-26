import { asyncHandler } from "../../utils/asyncHandler.js"
import jwt from "jsonwebtoken"
import { User } from "../../models/user.models.js"
import { ApiResponse } from "../../utils/ApiResponse.js"

export const verifyMember = asyncHandler(async (req, res, next) => {
    try {
        let token;
        if (req.cookies?.UaccessToken) {
            token = req.cookies.UaccessToken
        } else if (req.header("Authorization")) {
            token = req.header("Authorization").replace("Bearer ", "");
        }

        if (!token) {
            return res.status(401).json(
                new ApiResponse(401, null, "Unauthorized request for accessing Member routes")
            );
        }

        const decodedInformation = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedInformation?._id).select("-password")
        if (!user) {
            return res.status(401).json(
                new ApiResponse(401, null, "Invalid User access token")
            );
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json(
            new ApiResponse(401, null, error?.message || "User Token validation failed")
        );
    }
})