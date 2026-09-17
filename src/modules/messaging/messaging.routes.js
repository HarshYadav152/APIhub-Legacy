import { Router } from "express";
import { registerKeys, getPreKeyBundle } from "./keys.controller.js";
import { sendMessage, getConversation, markMessageRead } from "./message.controller.js";
import {
    registerKeysSchema,
    fetchPreKeyBundleSchema,
    sendMessageSchema,
    conversationSchema,
    markReadSchema,
} from "./messaging.validation.js";
import { verifyAnyAccount } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";

const router = Router();

// Every messaging route works identically for a User or a Hof caller —
// verifyAnyAccount normalizes whichever one authenticated onto
// req.account, so nothing below branches on which role is calling.
router.use(verifyAnyAccount);

router.post("/keys", validate(registerKeysSchema), registerKeys);
router.get("/keys/:accountType/:accountId", validate(fetchPreKeyBundleSchema), getPreKeyBundle);

router.post("/messages", validate(sendMessageSchema), sendMessage);
router.get("/messages/:withAccountType/:withAccountId", validate(conversationSchema), getConversation);
router.patch("/messages/:messageId/read", validate(markReadSchema), markMessageRead);

export default router;
