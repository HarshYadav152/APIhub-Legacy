import { Router } from "express";
import {
    addMembers,
    createFamily,
    getAllFamilyMembers,
    getId,
    getMembersCount,
    removeMember,
    viewFamilyAsHof,
    viewFamilyAsMember,
} from "./family.controller.js";
import { createFamilySchema, familyMemberParamsSchema, paginationSchema } from "./family.validation.js";
import { verifyAuth } from "../../middlewares/auth.middleware.js";
import { requireEmailVerification } from "../../middlewares/verifyEmail.middleware.js";
import { verifyFamilyMember } from "../../middlewares/verifyFamilyMember.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";

const router = Router();

// head of family must be logged in (and, for creation/additions, email
// verified) to perform any operation on family routes
router
    .route("/create")
    .post(verifyAuth("hof"), requireEmailVerification, validate(createFamilySchema), createFamily);

router
    .route("/add-member/:userId")
    .post(verifyAuth("hof"), requireEmailVerification, validate(familyMemberParamsSchema), addMembers);
router
    .route("/remove-member/:userId")
    .post(verifyAuth("hof"), validate(familyMemberParamsSchema), removeMember);
router.route("/total-member").get(verifyAuth("hof"), getMembersCount);
router.route("/get-all-members").get(verifyAuth("hof"), validate(paginationSchema), getAllFamilyMembers);

// for hof family view
router.route("/view-hof").post(verifyAuth("hof"), viewFamilyAsHof);
router.route("/get-id").get(verifyAuth("hof"), getId);

// for member family view
router.route("/view-member").post(verifyAuth("user"), verifyFamilyMember, viewFamilyAsMember);

export default router;
