import fs from "node:fs";
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
import { complexesRouter } from "./routes/complexes.routes.js";
import { catalogProductsRouter } from "./routes/catalog-products.routes.js";
import { catalogArticlesRouter } from "./routes/catalog-articles.routes.js";
import { productionWorkTypesRouter } from "./routes/production-work-types.routes.js";
import { productionDetailsRouter } from "./routes/production-details.routes.js";
import { productsRouter } from "./routes/products.routes.js";
import { ordersRouter } from "./routes/orders.routes.js";
import { tradeGoodsRouter } from "./routes/trade-goods.routes.js";
import { tradeGoodCategoriesRouter } from "./routes/trade-good-categories.routes.js";
import { tradeGoodSubcategoriesRouter } from "./routes/trade-good-subcategories.routes.js";
import { rolesReadRouter, rolesWriteRouter } from "./routes/roles.routes.js";
import {
  authzMatrixDiagnosticsRouter,
  authzMatrixReadRouter,
  authzMatrixWriteRouter,
} from "./routes/authz-matrix.routes.js";
import { surfaceFinishesRouter } from "./routes/surface-finishes.routes.js";
import { unitsRouter } from "./routes/units.routes.js";
import { usersReadRouter, usersWriteRouter } from "./routes/users.routes.js";
import { dbBackupsRouter } from "./routes/db-backups.routes.js";
import { systemAdminRouter } from "./routes/system-admin.routes.js";
import { bulkRouter } from "./routes/bulk.routes.js";
import { authAuthedRouter, authPublicRouter } from "./routes/auth.routes.js";
import { requireAdmin, requireAuth } from "./middleware/auth-jwt.js";
import { httpErrorHandler } from "./middleware/http-error.js";
import { requestContextMiddleware } from "./middleware/request-context.js";

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

  app.use(cors({ origin: true, credentials: true }));
  app.use(helmet());
  app.use(express.json({ limit: config.jsonBodyLimit }));
  app.use(requestContextMiddleware);

  if (!fs.existsSync(config.kpPhotosDir)) {
    fs.mkdirSync(config.kpPhotosDir, { recursive: true });
  }
  app.use(
    "/media/kp-photos",
    // Профессиональная схема: versioned URLs (`?v=<mtime>`) + длинный cache-control.
    // Тогда F5 быстрый (берём из кэша), а при замене файла URL меняется и браузер
    // автоматически подтягивает свежую картинку без ручного сброса кэша.
    express.static(config.kpPhotosDir, {
      index: false,
      fallthrough: false,
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      immutable: true,
    }),
  );

  if (!fs.existsSync(config.tradeGoodsPhotosDir)) {
    fs.mkdirSync(config.tradeGoodsPhotosDir, { recursive: true });
  }
  app.use(
    "/media/trade-goods",
    express.static(config.tradeGoodsPhotosDir, {
      index: false,
      fallthrough: false,
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      immutable: true,
    }),
  );

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
  authed.use("/production-details", productionDetailsRouter);
  authed.use("/products", productsRouter);
  authed.use("/orders", ordersRouter);
  authed.use("/trade-goods", tradeGoodsRouter);
  authed.use("/trade-good-categories", tradeGoodCategoriesRouter);
  authed.use("/trade-good-subcategories", tradeGoodSubcategoriesRouter);

  authed.use("/clients", clientsRouter);
  authed.use("/organizations", organizationsRouter);
  authed.use("/commercial-offers", commercialOffersRouter);
  authed.use("/kp-photos", kpPhotosRouter);
  authed.use("/material-characteristics", materialCharacteristicsRouter);
  authed.use("/materials", materialsRouter);
  authed.use("/complexes", complexesRouter);
  authed.use("/catalog-products", catalogProductsRouter);
  authed.use("/catalog-articles", catalogArticlesRouter);
  authed.use("/roles", rolesReadRouter);
  authed.use("/authz-matrix", authzMatrixReadRouter);
  authed.use("/users", usersReadRouter);

  const bulkAdminGuard = express.Router();
  bulkAdminGuard.use(requireAdmin);
  bulkAdminGuard.use(bulkRouter);
  authed.use("/bulk", bulkAdminGuard);

  const admin = express.Router();
  admin.use(requireAuth);
  admin.use(requireAdmin);
  admin.use("/users", usersWriteRouter);
  admin.use("/roles", rolesWriteRouter);
  admin.use("/db-backups", dbBackupsRouter);
  admin.use("/system", systemAdminRouter);
  admin.use("/authz-matrix", authzMatrixDiagnosticsRouter);
  admin.use("/authz-matrix", authzMatrixWriteRouter);

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
