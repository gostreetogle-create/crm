import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

/** Список пользователей — любой авторизованный (плитка «Пользователи» на хабе не только у admin). */
export const usersReadRouter = Router();

/** Создание/изменение/удаление — только admin (как раньше под `requireAdmin`). */
export const usersWriteRouter = Router();

const CreateSchema = z.object({
  login: z.string().trim().min(1),
  password: z.string().min(1),
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  roleId: z.string().min(1),
});

const UpdateSchema = z.object({
  login: z.string().trim().min(1),
  password: z.string(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  roleId: z.string().min(1),
});

function toJson(row: {
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

usersReadRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await prisma.user.findMany({ orderBy: { login: 'asc' } });
    res.json(rows.map(toJson));
  } catch (e) {
    next(e);
  }
});

usersWriteRouter.post('/', async (req, res, next) => {
  try {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const { login, password, fullName, email, phone, roleId } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 10);
    try {
      const row = await prisma.user.create({
        data: { login, passwordHash, fullName, email, phone, roleId },
      });
      res.status(201).json(toJson(row));
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
        res.status(409).json({ error: 'duplicate_login' });
        return;
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});

usersWriteRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const { login, password, fullName, email, phone, roleId } = parsed.data;
    const data: {
      login: string;
      fullName: string;
      email: string;
      phone: string;
      roleId: string;
      passwordHash?: string;
    } = { login, fullName, email, phone, roleId };
    if (password.trim().length > 0) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    try {
      const row = await prisma.user.update({
        where: { id },
        data,
      });
      res.json(toJson(row));
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2025') {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
        res.status(409).json({ error: 'duplicate_login' });
        return;
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});

usersWriteRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.user.delete({ where: { id } });
      res.status(204).send();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2025') {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});
