import type { NextFunction, Request, Response } from "express";
import { writeDiagnostic } from "../lib/diagnostic-log.js";
import { getEffectivePermissionKeysForRoleId } from "../lib/authz-effective-keys.js";

/** Мастер-ключ: доступ ко всем сегментам `POST/GET /api/bulk/*` с проверкой `requireEffectiveBulkPermissionKey`. */
export const BULK_ALL_PERMISSION_KEY = "admin.bulk.all";

/**
 * Проверка одного ключа из матрицы (dict.hub.*, admin.bulk.*, page.*, crud.*).
 * Используется после `requireAuth`; для админских маршрутов — вместе с `requireAdmin`.
 */
export function requireEffectivePermissionKey(requiredKey: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      const keys = await getEffectivePermissionKeysForRoleId(req.auth.roleId);
      if (!keys.has(requiredKey)) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
      next();
    } catch (dbErr) {
      const stack = dbErr instanceof Error ? dbErr.stack : String(dbErr);
      writeDiagnostic({
        ts: new Date().toISOString(),
        type: "authz_effective_keys_db_error",
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl ?? req.url,
        message: dbErr instanceof Error ? dbErr.message : String(dbErr),
        name: dbErr instanceof Error ? dbErr.name : "Error",
        stack: stack ? stack.slice(0, 2000) : undefined,
      });
      res.status(503).json({
        error: "db_unavailable",
        message: "Не удалось проверить права (БД).",
        requestId: req.requestId,
      });
    }
  };
}

/**
 * Как `requireEffectivePermissionKey`, но для массового JSON: достаточно ключа сегмента (`admin.bulk.units` …)
 * или мастер-ключа {@link BULK_ALL_PERMISSION_KEY}.
 */
export function requireEffectiveBulkPermissionKey(requiredSegmentKey: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      const keys = await getEffectivePermissionKeysForRoleId(req.auth.roleId);
      if (!keys.has(requiredSegmentKey) && !keys.has(BULK_ALL_PERMISSION_KEY)) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
      next();
    } catch (dbErr) {
      const stack = dbErr instanceof Error ? dbErr.stack : String(dbErr);
      writeDiagnostic({
        ts: new Date().toISOString(),
        type: "authz_effective_keys_db_error",
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl ?? req.url,
        message: dbErr instanceof Error ? dbErr.message : String(dbErr),
        name: dbErr instanceof Error ? dbErr.name : "Error",
        stack: stack ? stack.slice(0, 2000) : undefined,
      });
      res.status(503).json({
        error: "db_unavailable",
        message: "Не удалось проверить права (БД).",
        requestId: req.requestId,
      });
    }
  };
}
