import { Router } from "express";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getDbState } from "../config/database.config.js";

import userRouter from "../modules/users/user.routes.js";
import hofRouter from "../modules/hof/hof.routes.js";
import familyRouter from "../modules/family/family.routes.js";
import verifyRouter from "../modules/verification/verification.routes.js";
import messagingRouter from "../modules/messaging/messaging.routes.js";

const router = Router();

router.get(
    "/health",
    asyncHandler(async (_req, res) => {
        const db = getDbState();
        const healthy = db.isConnected;

        const payload = {
            status: healthy ? "UP" : "DEGRADED",
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.floor(process.uptime()),
            database: db,
            memory: {
                rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
                heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            },
        };

        return res
            .status(healthy ? 200 : 503)
            .json(
                new ApiResponse(
                    healthy ? 200 : 503,
                    payload,
                    healthy ? "Service is healthy" : "Service is degraded"
                )
            );
    })
);

router.use("/members", userRouter);
router.use("/hof", hofRouter);
router.use("/family", familyRouter);
router.use("/verify", verifyRouter);
router.use("/messaging", messagingRouter);

export default router;
