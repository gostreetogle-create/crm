import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

function writeReqLog(
  level: "info" | "warn" | "error",
  requestId: string | undefined,
  meta: Record<string, unknown>,
): void {
  process.stderr.write(
    JSON.stringify({
      level,
      requestId: requestId ?? null,
      t: new Date().toISOString(),
      ...meta,
    }) + "\n",
  );
}

export const requestContextMiddleware: RequestHandler = (req, res, next) => {
  const incoming = req.headers["x-request-id"];
  const id =
    typeof incoming === "string" && incoming.trim().length > 0
      ? incoming.trim().slice(0, 128)
      : randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  req.log = {
    info: (meta) => writeReqLog("info", req.requestId, meta),
    warn: (meta) => writeReqLog("warn", req.requestId, meta),
    error: (meta) => writeReqLog("error", req.requestId, meta),
  };
  next();
};
