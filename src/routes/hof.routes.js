import { entryHOF, registerHOF } from "../controllers/hof.controllers.js";
import {Router} from "express";

const router = Router();

// unsecured routes
router.route("/register").post(registerHOF) // for signup
router.route("/entry").post(entryHOF) // for login

export default router;