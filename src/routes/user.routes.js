import { Router } from "express";
import { loginUser, registerUser } from "../controllers/user.controllers.js";

const router = Router();

// unsecured router for register and login
router.route("/register-user").post(registerUser)
router.route("/login-user").post(loginUser)

export default router;