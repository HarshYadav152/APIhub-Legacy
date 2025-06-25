import { Router } from "express";
import { loginUser, registerUser } from "../controllers/user.controllers.js";
import { verifyMember } from "../middlewares/verifyMember.middleware.js";

const router = Router();

// unsecured router for register and login
router.route("/register-user").post(registerUser)
router.route("/login-user").post(loginUser)

// secured routes must be loggedin
router.route("/complete-profile").post(verifyMember,)

export default router;