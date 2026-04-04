import { Router } from "express";
import { getSystemStatus } from "../lib/system-status.js";

/** Монтируется под `/api/admin/system` (уже с requireAuth + requireAdmin). */
export const systemAdminRouter = Router();

systemAdminRouter.get("/status", async (_req, res, next) => {
  try {
    const payload = await getSystemStatus();
    res.json(payload);
  } catch (e) {
    next(e);
  }
});
