import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { clientsRouter } from './routes/clients.routes.js';
import { coatingsRouter } from './routes/coatings.routes.js';
import { colorsRouter } from './routes/colors.routes.js';
import { geometriesRouter } from './routes/geometries.routes.js';
import { materialCharacteristicsRouter } from './routes/material-characteristics.routes.js';
import { materialsRouter } from './routes/materials.routes.js';
import { materialGeometryRouter } from './routes/material-geometry.routes.js';
import { productionWorkTypesRouter } from './routes/production-work-types.routes.js';
import { rolesRouter } from './routes/roles.routes.js';
import { surfaceFinishesRouter } from './routes/surface-finishes.routes.js';
import { unitsRouter } from './routes/units.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { httpErrorHandler } from './middleware/http-error.js';

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

  const api = express.Router();
  api.use('/units', unitsRouter);
  api.use('/colors', colorsRouter);
  api.use('/surface-finishes', surfaceFinishesRouter);
  api.use('/coatings', coatingsRouter);
  api.use('/geometries', geometriesRouter);
  api.use('/production-work-types', productionWorkTypesRouter);
  api.use('/clients', clientsRouter);
  api.use('/material-characteristics', materialCharacteristicsRouter);
  api.use('/materials', materialsRouter);
  api.use('/roles', rolesRouter);
  api.use('/users', usersRouter);
  app.use('/api', api);

  app.use(materialGeometryRouter);
  app.use('/api', materialGeometryRouter);

  app.get('/', (_req, res) =>
    res.json({
      ok: true,
      health: '/health',
      apiHealth: '/api/health',
      api: '/api/*',
      materialGeometry: '/material-geometry/model',
    }),
  );

  app.use(httpErrorHandler);

  return app;
}
