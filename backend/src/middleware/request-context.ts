import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestContextMiddleware: RequestHandler = (req, res, next) => {
  const incoming = req.headers["x-request-id"];
  const id =
    typeof incoming === "string" && incoming.trim().length > 0
      ? incoming.trim().slice(0, 128)
      : randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
};
