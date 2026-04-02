import express from "express";
import cors from "cors";
import { config } from "./config.js";
import helmet from "helmet";
import { clientsRouter } from "./routes/clients.routes.js";
import { organizationsRouter } from "./routes/organizations.routes.js";
import { commercialOffersRouter } from "./routes/commercial-offers.routes.js";
import { kpPhotosRouter } from "./routes/kp-photos.routes.js";
import { coatingsRouter } from "./routes/coatings.routes.js";
import { colorsRouter } from "./routes/colors.routes.js";
import { geometriesRouter } from "./routes/geometries.routes.js";
import { materialCharacteristicsRouter } from "./routes/material-characteristics.routes.js";
import { materialsRouter } from "./routes/materials.routes.js";
import { materialGeometryRouter } from "./routes/material-geometry.routes.js";
import { productionWorkTypesRouter } from "./routes/production-work-types.routes.js";
import { rolesRouter } from "./routes/roles.routes.js";
import { surfaceFinishesRouter } from "./routes/surface-finishes.routes.js";
import { unitsRouter } from "./routes/units.routes.js";
import { usersRouter } from "./routes/users.routes.js";
import { dbBackupsRouter } from "./routes/db-backups.routes.js";
import { excelDictionariesRouter } from "./routes/excel-dictionaries.routes.js";
import { authAuthedRouter, authPublicRouter } from "./routes/auth.routes.js";
import { requireAdmin, requireAuth } from "./middleware/auth-jwt.js";
import { httpErrorHandler } from "./middleware/http-error.js";

function materialGeometryProtected(): express.Router {
  const r = express.Router();
  r.use(requireAuth);
  r.use(materialGeometryRouter);
  return r;
}

export function createApp() {
  const app = express();

  // One trusted proxy hop (nginx). Avoids permissive mode that breaks express-rate-limit validation.
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    }),
  );
  app.use(helmet());
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  const api = express.Router();

  api.use("/auth", authPublicRouter);

  const authed = express.Router();
  authed.use(requireAuth);
  authed.use("/auth", authAuthedRouter);
  authed.use("/units", unitsRouter);
  authed.use("/colors", colorsRouter);
  authed.use("/surface-finishes", surfaceFinishesRouter);
  authed.use("/coatings", coatingsRouter);
  authed.use("/geometries", geometriesRouter);
  authed.use("/production-work-types", productionWorkTypesRouter);
  authed.use("/clients", clientsRouter);
  authed.use("/organizations", organizationsRouter);
  authed.use("/commercial-offers", commercialOffersRouter);
  authed.use("/kp-photos", kpPhotosRouter);
  authed.use("/material-characteristics", materialCharacteristicsRouter);
  authed.use("/materials", materialsRouter);

  const admin = express.Router();
  admin.use(requireAuth);
  admin.use(requireAdmin);
  admin.use("/users", usersRouter);
  admin.use("/roles", rolesRouter);
  admin.use("/db-backups", dbBackupsRouter);
  admin.use("/excel-dictionaries", excelDictionariesRouter);

  api.use(authed);
  api.use(admin);

  app.use("/api", api);

  const mg = materialGeometryProtected();
  app.use(mg);
  app.use("/api", mg);

  app.get("/", (_req, res) =>
    res.json({
      ok: true,
      health: "/health",
      apiHealth: "/api/health",
      api: "/api/*",
      materialGeometry: "/material-geometry/model",
    }),
  );

  app.use(httpErrorHandler);

  return app;
}
