import { Router } from "express";
import { getSystemStatus } from "../lib/system-status.js";

/** Монтируется под `/api/system` (admin: requireAuth + requireAdmin в app.ts). */
export const systemAdminRouter = Router();

systemAdminRouter.get("/status", async (_req, res, next) => {
  try {
    const payload = await getSystemStatus();
    res.json(payload);
  } catch (e) {
    next(e);
  }
});
