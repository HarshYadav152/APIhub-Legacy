import { Router } from "express";
import {
    registerHOF,
    entryHOF,
    refreshHofAccessToken,
    logoutHOF,
    completeHofProfile,
} from "./hof.controller.js";
import { registerHofSchema, loginHofSchema, completeHofProfileSchema } from "./hof.validation.js";
import { verifyAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { authRateLimiter } from "../../middlewares/rateLimiter.middleware.js";
import { upload } from "../../middlewares/upload.middleware.js";

const router = Router();

// Public
router.post("/register", authRateLimiter, validate(registerHofSchema), registerHOF);
router.post("/entry", authRateLimiter, validate(loginHofSchema), entryHOF);
router.post("/refresh-token", refreshHofAccessToken);

// Authenticated (hof)
router.post("/logout", verifyAuth("hof"), logoutHOF);
router.post(
    "/complete-profile",
    verifyAuth("hof"),
    // Standardized to match the users module's field name
    // ("profile-picture" vs "profile_picture" previously diverged).
    upload.single("profile_picture"),
    validate(completeHofProfileSchema),
    completeHofProfile
);

export default router;
