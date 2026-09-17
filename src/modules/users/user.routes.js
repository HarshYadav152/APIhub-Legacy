import { Router } from "express";
import {
    registerUser,
    loginUser,
    refreshUserAccessToken,
    logoutUser,
    completeMemberProfile,
} from "./user.controller.js";
import { registerUserSchema, loginUserSchema, completeMemberProfileSchema } from "./user.validation.js";
import { verifyAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { authRateLimiter } from "../../middlewares/rateLimiter.middleware.js";
import { upload } from "../../middlewares/upload.middleware.js";

const router = Router();

// Public
router.post("/register-user", authRateLimiter, validate(registerUserSchema), registerUser);
router.post("/login-user", authRateLimiter, validate(loginUserSchema), loginUser);
router.post("/refresh-token", refreshUserAccessToken);

// Authenticated (user)
router.post("/logout", verifyAuth("user"), logoutUser);
router.post(
    "/complete-profile",
    verifyAuth("user"),
    upload.single("profile_picture"),
    validate(completeMemberProfileSchema),
    completeMemberProfile
);

export default router;
