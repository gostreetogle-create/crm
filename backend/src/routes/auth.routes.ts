import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signAccessToken } from '../lib/jwt.js';

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
    password: '',
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    roleId: row.roleId,
  };
}

export const authPublicRouter = Router();

authPublicRouter.post('/login', async (req, res, next) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const { login, password } = parsed.data;
    const row = await prisma.user.findUnique({ where: { login } });
    if (!row) {
      res.status(401).json({ error: 'invalid_credentials' });
      return;
    }
    const ok = await bcrypt.compare(password, row.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'invalid_credentials' });
      return;
    }
    const token = await signAccessToken({
      userId: row.id,
      login: row.login,
      roleId: row.roleId,
    });
    res.json({ token, user: userToJson(row) });
  } catch (e) {
    next(e);
  }
});

/** Маршруты под префиксом `/api/auth`, уже за `requireAuth`. */
export const authAuthedRouter = Router();

authAuthedRouter.get('/me', async (req, res, next) => {
  try {
    const id = req.auth!.userId;
    const row = await prisma.user.findUnique({ where: { id } });
    if (!row) {
      res.status(401).json({ error: 'user_not_found' });
      return;
    }
    res.json({ user: userToJson(row) });
  } catch (e) {
    next(e);
  }
});
