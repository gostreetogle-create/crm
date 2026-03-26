import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { materialGeometryRouter } from './routes/material-geometry.routes.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Minimal MVP routes (no DB yet)
  app.use(materialGeometryRouter);
  app.use('/api', materialGeometryRouter);

  app.get('/', (_req, res) =>
    res.json({
      ok: true,
      health: '/health',
      apiHealth: '/api/health',
      materialGeometry: '/material-geometry/model',
    }),
  );

  return app;
}

