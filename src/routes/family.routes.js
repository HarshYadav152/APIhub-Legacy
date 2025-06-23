import { Router } from "express";
import { createFamily, modifyFamily, removeFamily, viewFamily } from "../controllers/family.controllers.js";

const router = Router();

// secured route 
// head of family must be loggedin to perform any operation family routes
// family members may have some permission to use routes but onlu for loggedin member also verified
router.route("/create",createFamily);
router.route("/view",viewFamily);

// double verification route only for head of family
router.route("/modify",modifyFamily);
router.route("/remove",removeFamily)

export default router;