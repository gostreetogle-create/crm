import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signAccessToken } from "../lib/jwt.js";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";

const LoginSchema = z.object({
  login: z.string().trim().min(1),
  password: z.string().min(1),
});

function userToJson(row: {
  id: string;
  login: string;
  fullName: string;
  email: string;
  phone: string;
  roleId: string;
}) {
  return {
    id: row.id,
    login: row.login,
    password: "",
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    roleId: row.roleId,
  };
}

export const authPublicRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // В production держим строгий лимит; в локальной разработке не блокируем частые повторы входа.
  max: config.nodeEnv === "production" ? 12 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "too_many_requests" });
  },
});

authPublicRouter.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const { login: loginRaw, password } = parsed.data;
    const login = loginRaw.trim();
    // PostgreSQL: сравнение логина без учёта регистра (Admin / admin).
    const row = await prisma.user.findFirst({
      where: { login: { equals: login, mode: "insensitive" } },
    });
    if (!row) {
      res.status(401).json({ error: "invalid_credentials" });
      return;
    }
    const ok = await bcrypt.compare(password, row.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "invalid_credentials" });
      return;
    }
    const role = await prisma.role.findUnique({ where: { id: row.roleId } });
    if (!role) {
      res.status(401).json({ error: "invalid_credentials" });
      return;
    }
    const token = await signAccessToken({
      userId: row.id,
      login: row.login,
      roleId: row.roleId,
      roleCode: role.code,
      isSystemRole: role.isSystem,
    });
    res.json({ token, user: userToJson(row) });
  } catch (e) {
    next(e);
  }
});

/** Маршруты под префиксом `/api/auth`, уже за `requireAuth`. */
export const authAuthedRouter = Router();

authAuthedRouter.get("/me", async (req, res, next) => {
  try {
    const id = req.auth!.userId;
    const row = await prisma.user.findUnique({ where: { id } });
    if (!row) {
      res.status(401).json({ error: "user_not_found" });
      return;
    }
    res.json({ user: userToJson(row) });
  } catch (e) {
    next(e);
  }
});
