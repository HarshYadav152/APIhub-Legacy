import { Router } from "express";
import { addMembers, createFamily, getAllFamilyMembers, getMembersCount, removeMember} from "../controllers/family.controllers.js";
import {verifyHof} from "../middlewares/verifyJWT/verifyHof.middleware.js"
import { requireEmailVerification } from "../middlewares/verifyEmail.middleware.js";

const router = Router();

// secured route 
// head of family must be loggedin to perform any operation family routes
// family members may have some permission to use routes but onlu for loggedin member also verified
router.route("/create").post(
    verifyHof,
    requireEmailVerification,
    createFamily
);

// add family members
router.route("/add-member/:userId").post(
    verifyHof,
    requireEmailVerification,
    addMembers
)
router.route("/remove-member/:userId").post(verifyHof,removeMember)
router.route("/total-member").get(verifyHof,getMembersCount)
router.route("/get-all-members").get(verifyHof,getAllFamilyMembers)

// router.route("/view").post(verifyHof,viewFamily);

// double verification route only for head of family
// router.route("/modify").post(verifyHof,modifyFamily);
// router.route("/remove").post(verifyHof,removeFamily)

export default router;