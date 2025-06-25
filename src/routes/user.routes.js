import { Router } from "express";
import { completeMemberProfile, loginUser, registerUser } from "../controllers/user.controllers.js";
import { verifyMember } from "../middlewares/verifyJWT/verifyMember.middleware.js";
import { upload } from "../middlewares/multers/member.multer.middleware.js";

const router = Router();

// unsecured router for register and login
router.route("/register-user").post(registerUser)
router.route("/login-user").post(loginUser)

// secured routes must be loggedin
router.route("/complete-profile").post(
    verifyMember,
    upload.single("profile_picture"),
    completeMemberProfile
)

// in future we have to add different routes for different component of profile

export default router;