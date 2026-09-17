import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
    accessTokenCookieOptions,
    refreshTokenCookieOptions,
    clearCookieOptions,
} from "../../utils/cookie.utils.js";
import { COOKIE_NAMES } from "../../config/constants.js";
import { User } from "./user.model.js";
import { uploadingFileonCloudinary } from "../../services/storage/cloudinary.service.js";
import { generateOTP, getOtpExpiry, hashOTP } from "../../services/otp/otp.service.js";
import { enqueueVerificationEmail } from "../../services/queue/email.queue.js";
import { issueTokenPair, rotateRefreshToken, revokeRefreshToken } from "../auth/auth.service.js";

const registerUser = asyncHandler(async (req, res) => {
    // Register with minimal details; the rest is collected in
    // completeMemberProfile once the user has joined a family.
    const { uname, uemail, upassword } = req.body;

    const existedUser = await User.findOne({ email: uemail });
    if (existedUser) {
        throw new ApiError(409, "A user already exists with this email");
    }

    const user = await User.create({
        full_name: uname,
        email: uemail,
        password: upassword,
    });

    const otp = generateOTP();
    user.emailVerificationToken = hashOTP(otp);
    user.emailVerificationExpiry = getOtpExpiry();
    await user.save();

    await enqueueVerificationEmail(user.email, otp);

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                { userId: user._id, needsVerification: true },
                "User registered. Please verify your email."
            )
        );
});

const loginUser = asyncHandler(async (req, res) => {
    const { uemail, upassword } = req.body;

    const member = await User.findOne({ email: uemail }).select("+password");
    if (!member) {
        // Deliberately the same message as a wrong password below —
        // confirming *which* part was wrong lets an attacker enumerate
        // registered emails.
        throw new ApiError(401, "Invalid email or password");
    }

    const isPasswordValid = await member.comparePassword(upassword);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid email or password");
    }

    member.last_login = new Date();
    const { accessToken, refreshToken } = await issueTokenPair(member);

    return res
        .status(200)
        .cookie(COOKIE_NAMES.USER_ACCESS_TOKEN, accessToken, accessTokenCookieOptions())
        .cookie("UrefreshToken", refreshToken, refreshTokenCookieOptions())
        .json(
            new ApiResponse(
                200,
                { accessToken, user: { id: member._id, email: member.email } },
                "Logged in successfully"
            )
        );
});

const refreshUserAccessToken = asyncHandler(async (req, res) => {
    const incomingToken = req.cookies?.UrefreshToken || req.body?.refreshToken;

    const { accessToken, refreshToken } = await rotateRefreshToken(incomingToken, User, "user");

    return res
        .status(200)
        .cookie(COOKIE_NAMES.USER_ACCESS_TOKEN, accessToken, accessTokenCookieOptions())
        .cookie("UrefreshToken", refreshToken, refreshTokenCookieOptions())
        .json(new ApiResponse(200, { accessToken }, "Access token refreshed"));
});

const logoutUser = asyncHandler(async (req, res) => {
    await revokeRefreshToken(req.user);

    return res
        .status(200)
        .clearCookie(COOKIE_NAMES.USER_ACCESS_TOKEN, clearCookieOptions())
        .clearCookie("UrefreshToken", clearCookieOptions())
        .json(new ApiResponse(200, null, "Logged out successfully"));
});

const completeMemberProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { number, dob, gender, street, city, country, pincode, rstatus, rtohof } = req.body;

    const pictureLocalPath = req.file?.path;
    if (!pictureLocalPath) {
        throw new ApiError(400, "Profile picture is required");
    }

    const avatar = await uploadingFileonCloudinary(pictureLocalPath);
    if (!avatar) {
        throw new ApiError(400, "Profile picture failed to upload");
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
            phone_number: number,
            date_of_birth: new Date(dob),
            gender,
            profile_picture: avatar.url,
            address: { ...req.user.address, street, city, country, postal_code: pincode },
            relationship_status: rstatus,
            relationship_to_hof: rtohof,
        },
        { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
});

export { registerUser, loginUser, refreshUserAccessToken, logoutUser, completeMemberProfile };
