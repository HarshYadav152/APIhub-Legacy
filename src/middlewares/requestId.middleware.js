import { randomUUID } from "crypto";

/**
 * Attaches a unique ID to every request, echoed back as X-Request-Id so
 * a client (or a support ticket) can hand you the exact ID to grep logs
 * for. Honors an inbound X-Request-Id if a reverse proxy/load balancer
 * already set one, so the ID stays consistent across the whole chain
 * rather than getting rewritten at each hop.
 */
export const requestId = (req, res, next) => {
    req.id = req.header("X-Request-Id") || randomUUID();
    res.setHeader("X-Request-Id", req.id);
    next();
};
