import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../lib/jwt.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const token = h.slice('Bearer '.length).trim();
    if (!token) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const payload = await verifyAccessToken(token);
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const auth = req.auth;
    if (typeof auth.roleCode === 'string' && typeof auth.isSystemRole === 'boolean') {
      const allowed = auth.isSystemRole || auth.roleCode === 'admin';
      if (!allowed) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      next();
      return;
    }

    try {
      const role = await prisma.role.findUnique({ where: { id: auth.roleId } });
      if (!role || (!role.isSystem && role.code !== 'admin')) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      next();
    } catch (dbErr) {
      // eslint-disable-next-line no-console
      console.error('[requireAdmin] DB error', dbErr);
      res.status(503).json({ error: 'db_unavailable', message: 'Не удалось проверить роль (БД).' });
    }
  } catch (e) {
    next(e);
  }
}
