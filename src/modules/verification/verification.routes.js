import { Router } from "express";
import { sendVerificationOTP, verifyOTP } from "./verification.controller.js";
import { revokeMemberVerification, revokeHofVerification } from "./revoke.controller.js";
import { sendOtpSchema, verifyOtpSchema, revokeVerificationParamsSchema } from "./verification.validation.js";
import { verifyAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { otpRateLimiter } from "../../middlewares/rateLimiter.middleware.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

const router = Router();

router.post("/send-otp", otpRateLimiter, validate(sendOtpSchema), sendVerificationOTP);
router.post("/verify-otp", otpRateLimiter, validate(verifyOtpSchema), verifyOTP);

router.get("/status", verifyAuth("user"), (req, res) => {
    res.status(200).json(
        new ApiResponse(200, { isVerified: req.user.isEmailVerified }, "Verification status")
    );
});

router.get("/hof-status", verifyAuth("hof"), (req, res) => {
    res.status(200).json(
        new ApiResponse(200, { isVerified: req.hof.isEmailVerified }, "HOF verification status")
    );
});

// Split into two endpoints (was one generic /revoke/:email/:role handler)
// because the authorization rule genuinely differs between the two cases:
// a HOF can revoke a member of their own family, but can only revoke
// their own HOF verification, not anyone else's.
router.post(
    "/revoke-member/:email",
    verifyAuth("hof"),
    validate(revokeVerificationParamsSchema),
    revokeMemberVerification
);
router.post(
    "/revoke-hof/:email",
    verifyAuth("hof"),
    validate(revokeVerificationParamsSchema),
    revokeHofVerification
);

export default router;
