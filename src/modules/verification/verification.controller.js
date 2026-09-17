import { User } from "../users/user.model.js";
import { Hof } from "../hof/hof.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { generateOTP, hashOTP, getOtpExpiry } from "../../services/otp/otp.service.js";
import { enqueueVerificationEmail } from "../../services/queue/email.queue.js";

const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 60 * 60 * 1000; // 1 hour

// Send verification OTP to a user or HOF
export const sendVerificationOTP = asyncHandler(async (req, res) => {
    const { email, role } = req.body;

    const Model = role === "hof" ? Hof : User;
    const searchField = role === "hof" ? "hof_email" : "email";

    const account = await Model.findOne({ [searchField]: email });
    if (!account) {
        throw new ApiError(404, `${role === "hof" ? "HOF" : "User"} not found`);
    }

    if (account.isEmailVerified) {
        return res.status(200).json(new ApiResponse(200, { isVerified: true }, "Email is already verified"));
    }

    if (
        account.verificationAttempts >= MAX_ATTEMPTS &&
        account.lastVerificationAttempt &&
        Date.now() - new Date(account.lastVerificationAttempt).getTime() < LOCKOUT_TIME
    ) {
        const remainingMinutes = Math.ceil(
            (LOCKOUT_TIME - (Date.now() - new Date(account.lastVerificationAttempt).getTime())) / (60 * 1000)
        );
        throw new ApiError(429, `Too many attempts. Please try again in ${remainingMinutes} minutes`);
    }

    const otp = generateOTP();
    account.emailVerificationToken = hashOTP(otp);
    account.emailVerificationExpiry = getOtpExpiry();
    account.verificationAttempts = (account.verificationAttempts ?? 0) + 1;
    account.lastVerificationAttempt = new Date();
    await account.save();

    // Enqueue rather than send inline — the actual SMTP round-trip now
    // happens in the worker process, off this request's critical path.
    // A queue failure (e.g. Redis unreachable) still surfaces as an
    // error here via asyncHandler, since account.save() above already
    // committed the OTP — the user can safely retry send-otp.
    await enqueueVerificationEmail(email, otp);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                email,
                otpSent: true,
                attempts: account.verificationAttempts,
                remainingAttempts: MAX_ATTEMPTS - account.verificationAttempts,
            },
            "Your verification code is on its way to your email"
        )
    );
});

// Verify an OTP previously sent to email
export const verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp, role } = req.body;

    const Model = role === "hof" ? Hof : User;
    const searchField = role === "hof" ? "hof_email" : "email";

    const account = await Model.findOne({
        [searchField]: email,
        emailVerificationExpiry: { $gt: new Date() },
    });

    if (!account) {
        throw new ApiError(400, "Invalid or expired OTP");
    }

    if (account.emailVerificationToken !== hashOTP(otp)) {
        throw new ApiError(400, "Invalid OTP");
    }

    account.isEmailVerified = true;
    account.emailVerificationToken = undefined;
    account.emailVerificationExpiry = undefined;
    account.verificationAttempts = 0;
    await account.save();

    return res.status(200).json(new ApiResponse(200, { isVerified: true }, "Email verified successfully"));
});
