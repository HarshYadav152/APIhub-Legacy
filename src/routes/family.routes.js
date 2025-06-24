import { Router } from "express";
import { addMembers, createFamily, getMembersCount, modifyFamily, removeFamily, viewFamily } from "../controllers/family.controllers.js";
import {verifyHof} from "../middlewares/verifyHof.middleware.js"

const router = Router();

// secured route 
// head of family must be loggedin to perform any operation family routes
// family members may have some permission to use routes but onlu for loggedin member also verified
router.route("/create").post(verifyHof,createFamily);

// add family members
router.route("/add-members").post(verifyHof,addMembers)
router.route("/total-member").get(verifyHof,getMembersCount)

router.route("/view").post(verifyHof,viewFamily);

// double verification route only for head of family
router.route("/modify").post(verifyHof,modifyFamily);
router.route("/remove").post(verifyHof,removeFamily)

export default router;