import type { ErrorRequestHandler } from "express";
import { writeDiagnostic } from "../lib/diagnostic-log.js";

export const httpErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const stack = err instanceof Error ? err.stack : String(err);
  writeDiagnostic({
    ts: new Date().toISOString(),
    type: "http_500",
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl ?? req.url,
    message: err instanceof Error ? err.message : String(err),
    name: err instanceof Error ? err.name : "Error",
    stack: stack ? stack.slice(0, 2000) : undefined,
  });
  res.status(500).json({
    error: "internal_error",
    requestId: req.requestId,
  });
};
