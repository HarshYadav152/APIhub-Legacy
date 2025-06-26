// routes/verification.routes.js
import { Router } from "express";
import { sendVerificationOTP, verifyOTP } from "../controllers/verification.controller.js";
import { verifyMember } from "../middlewares/verifyJWT/verifyMember.middleware.js";
import { verifyHof } from "../middlewares/verifyJWT/verifyHof.middleware.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const router = Router();

// Send OTP routes
router.route("/send-otp").post(sendVerificationOTP);

// Verify OTP routes
router.route("/verify-otp").post(verifyOTP);

// Check verification status
router.route("/status").get(verifyMember, (req, res) => {
    res.status(200).json(
        new ApiResponse(200, { isVerified: req.user.isEmailVerified }, "Verification status")
    );
});

router.route("/hof-status").get(verifyHof, (req, res) => {
    res.status(200).json(
        new ApiResponse(200, { isVerified: req.hof.isEmailVerified }, "HOF verification status")
    );
});

export default router;