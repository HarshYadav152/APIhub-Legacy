import { Hof } from "./hof.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
    accessTokenCookieOptions,
    refreshTokenCookieOptions,
    clearCookieOptions,
} from "../../utils/cookie.utils.js";
import { COOKIE_NAMES } from "../../config/constants.js";
import { uploadingFileonCloudinary } from "../../services/storage/cloudinary.service.js";
import { issueTokenPair, rotateRefreshToken, revokeRefreshToken } from "../auth/auth.service.js";

const registerHOF = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    const existedHof = await Hof.findOne({ hof_email: email });
    if (existedHof) {
        throw new ApiError(409, "A head of family already exists with this email");
    }

    const hof = await Hof.create({
        hof_name: name,
        hof_email: email,
        password,
    });

    const createdHof = await Hof.findById(hof._id).select("-password");
    if (!createdHof) {
        throw new ApiError(500, "Something went wrong while creating the HOF account. Please try again.");
    }

    return res.status(201).json(new ApiResponse(201, createdHof, "HOF account created successfully"));
});

const entryHOF = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const hof = await Hof.findOne({ hof_email: email }).select("+password");
    if (!hof) {
        throw new ApiError(401, "Invalid email or password");
    }

    const isPasswordValid = await hof.comparePassword(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid email or password");
    }

    const { accessToken, refreshToken } = await issueTokenPair(hof);

    return res
        .status(200)
        .cookie(COOKIE_NAMES.HOF_ACCESS_TOKEN, accessToken, accessTokenCookieOptions())
        .cookie("HrefreshToken", refreshToken, refreshTokenCookieOptions())
        .json(
            new ApiResponse(
                200,
                { accessToken, hof: { id: hof._id, email: hof.hof_email } },
                "Logged in successfully"
            )
        );
});

const refreshHofAccessToken = asyncHandler(async (req, res) => {
    const incomingToken = req.cookies?.HrefreshToken || req.body?.refreshToken;

    const { accessToken, refreshToken } = await rotateRefreshToken(incomingToken, Hof, "hof");

    return res
        .status(200)
        .cookie(COOKIE_NAMES.HOF_ACCESS_TOKEN, accessToken, accessTokenCookieOptions())
        .cookie("HrefreshToken", refreshToken, refreshTokenCookieOptions())
        .json(new ApiResponse(200, { accessToken }, "Access token refreshed"));
});

const logoutHOF = asyncHandler(async (req, res) => {
    await revokeRefreshToken(req.hof);

    return res
        .status(200)
        .clearCookie(COOKIE_NAMES.HOF_ACCESS_TOKEN, clearCookieOptions())
        .clearCookie("HrefreshToken", clearCookieOptions())
        .json(new ApiResponse(200, null, "Logged out successfully"));
});

const completeHofProfile = asyncHandler(async (req, res) => {
    const hofId = req.hof._id;
    const { number, dob, gender, mstatus } = req.body;

    const pictureLocalPath = req.file?.path;
    if (!pictureLocalPath) {
        throw new ApiError(400, "Profile picture is required");
    }

    const avatar = await uploadingFileonCloudinary(pictureLocalPath);
    if (!avatar) {
        throw new ApiError(400, "Profile picture failed to upload");
    }

    const updatedHof = await Hof.findByIdAndUpdate(
        hofId,
        {
            phone_number: number,
            date_of_birth: new Date(dob),
            gender,
            marital_status: mstatus,
            profile_picture: avatar.url,
        },
        { new: true, runValidators: true }
    ).select("-password");

    if (!updatedHof) {
        throw new ApiError(404, "HOF not found");
    }

    return res.status(200).json(new ApiResponse(200, updatedHof, "Profile updated successfully"));
});

export { registerHOF, entryHOF, refreshHofAccessToken, logoutHOF, completeHofProfile };
