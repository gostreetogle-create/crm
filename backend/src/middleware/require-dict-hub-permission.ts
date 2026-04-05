import type { NextFunction, Request, Response } from "express";
import { writeDiagnostic } from "../lib/diagnostic-log.js";
import { getEffectivePermissionKeysForRoleId } from "../lib/authz-effective-keys.js";

/**
 * Доступ к API справочника по ключу `dict.hub.*` (согласовано с матрицей и дефолтами по коду роли).
 */
export function requireDictionaryHubPermission(requiredKey: string) {
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
