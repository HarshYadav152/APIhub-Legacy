import { completeHofProfile, entryHOF, registerHOF } from "../controllers/hof.controllers.js";
import {Router} from "express";
import { verifyHof } from "../middlewares/verifyJWT/verifyHof.middleware.js";
import { upload } from "../middlewares/multers/member.multer.middleware.js";

const router = Router();

// unsecured routes
router.route("/register").post(registerHOF) // for signup
router.route("/entry").post(entryHOF) // for login

// secured routes only loggedin hof access these routes
router.route("/complete-profile").post(
    verifyHof,
    upload.single("profile-picture"),
    completeHofProfile
)

export default router;