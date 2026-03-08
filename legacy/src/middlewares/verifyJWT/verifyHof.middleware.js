import { ApiError } from "../../utils/ApiError.js"
import { asyncHandler } from "../../utils/asyncHandler.js"
import jwt from "jsonwebtoken"
import { Hof } from "../../models/hof.models.js"

export const verifyHof = asyncHandler(async (req,_,next) => {
    try {
        let token;
        if (req.cookies?.HaccessToken) {
            token = req.cookies.HaccessToken
        } else if (req.header("Authorization")) {
            token = req.header("Authorization").replace("Bearer ", "");
        }

        if (!token) {
            throw new ApiError(401, "Unauthourized Request for accessing HOF routes...");
        }

        const decodedInformation = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const hof = await Hof.findById(decodedInformation?._id).select("-password")
        if(!hof){
            throw new ApiError(409,"Invalid HaccessToken");
        }

        req.hof = hof;
        next();
    }catch(error){
        throw new ApiError(401,error?.message || "Some problem occured in HaccessToken verification...");
    }
})