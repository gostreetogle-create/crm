import express from "express";
import type { Express } from "express";

export async function createCommercialOffersTestApp(): Promise<Express> {
  const { commercialOffersRouter } = await import("../../src/routes/commercial-offers.routes.js");
  const app = express();
  app.use(express.json());
  app.use("/offers", commercialOffersRouter);
  return app;
}
