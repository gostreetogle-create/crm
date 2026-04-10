import type { CorsOptions } from "cors";
import { config } from "../config.js";

export function resolveCorsOptions(): CorsOptions {
  const allowed = config.corsAllowedOrigins;
  if (allowed.length === 0) {
    return { origin: true, credentials: true };
  }
  const set = new Set(allowed);
  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, set.has(origin));
    },
    credentials: true,
  };
}
