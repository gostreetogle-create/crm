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
    const role = await prisma.role.findUnique({ where: { id: req.auth.roleId } });
    if (!role || (!role.isSystem && role.code !== 'admin')) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    next();
  } catch (e) {
    next(e);
  }
}
