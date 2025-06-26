// controllers/verification.controllers.js
import { User } from '../models/user.models.js';
import { Hof } from '../models/hof.models.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateOTP, hashOTP, getOtpExpiry } from '../utils/services/otp/otp.service.js';
import { sendVerificationEmail } from '../utils/services/mail/email.service.js';

const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 60 * 60 * 1000; // 1 hour in milliseconds

// Send verification OTP to user/HOF
export const sendVerificationOTP = asyncHandler(async (req, res) => {
    const { email, role } = req.body;

    // Determine which model and field to use
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

        // Find user by email using the appropriate field
        const user = await Model.findOne(query);

        if (!user) {
            return res.status(404).json(
                new ApiResponse(404, null, `${role === 'hof' ? 'HOF' : 'User'} not found`)
            );
        }

        // Check if user is already verified
        if (user.isEmailVerified) {
            return res.status(200).json(
                new ApiResponse(200, { isVerified: true }, "Email is already verified")
            );
        }

        // Check for too many attempts
        if (
            user.verificationAttempts >= MAX_ATTEMPTS &&
            user.lastVerificationAttempt &&
            (Date.now() - new Date(user.lastVerificationAttempt).getTime()) < LOCKOUT_TIME
        ) {
            const remainingTime = Math.ceil(
                (LOCKOUT_TIME - (Date.now() - new Date(user.lastVerificationAttempt).getTime())) / (60 * 1000)
            );

            return res.status(429).json(
                new ApiResponse(429, null, `Too many attempts. Please try again after ${remainingTime} minutes`)
            );
        }

        // Generate OTP
        const otp = generateOTP();
        const hashedOTP = hashOTP(otp);

        // Update user with OTP details
        user.emailVerificationToken = hashedOTP;
        user.emailVerificationExpiry = getOtpExpiry();
        user.verificationAttempts = user.verificationAttempts ? user.verificationAttempts + 1 : 1;
        user.lastVerificationAttempt = new Date();

        await user.save();

        // Send email
        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) {
            return res.status(500).json(
                new ApiResponse(500, null, "Failed to send verification email")
            );
        }

        return res.status(200).json(
            new ApiResponse(200, {
                email,
                otpSent: true,
                attempts: user.verificationAttempts,
                remainingAttempts: MAX_ATTEMPTS - user.verificationAttempts
            }, "OTP sent successfully to your email")
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, null, `Error sending OTP: ${error.message}`)
        );
    }
});

// Verify OTP sent to email
export const verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp, role } = req.body;

    if (!email || !otp) {
        return res.status(400).json(
            new ApiResponse(400, null, "Email and OTP are required")
        );
    }

    // Determine which model to use
    const Model = role === 'hof' ? Hof : User;

    try {
        // Find user by email
        const user = await Model.findOne({
            email,
            emailVerificationExpiry: { $gt: new Date() } // Check if OTP is not expired
        });

        if (!user) {
            return res.status(400).json(
                new ApiResponse(400, null, "Invalid or expired OTP")
            );
        }

        // Verify OTP
        const hashedOTP = hashOTP(otp);

        if (user.emailVerificationToken !== hashedOTP) {
            return res.status(400).json(
                new ApiResponse(400, null, "Invalid OTP")
            );
        }

        // Update user verification status
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpiry = undefined;
        user.verificationAttempts = 0;

        await user.save();

        return res.status(200).json(
            new ApiResponse(200, { isVerified: true }, "Email verified successfully")
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, null, `Error verifying OTP: ${error.message}`)
        );
    }
});