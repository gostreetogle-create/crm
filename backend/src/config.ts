import fs from 'node:fs';
import path from 'node:path';
import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const envFileFromVar = process.env.ENV_FILE;
const candidate = envFileFromVar ? envFileFromVar : `.env.${nodeEnv}`;

const envPath = path.resolve(process.cwd(), candidate);
const fallbackPath = path.resolve(process.cwd(), '.env');

const resolvedEnvPath = fs.existsSync(envPath) ? envPath : fallbackPath;
dotenvConfig({ path: resolvedEnvPath, override: true });

const EnvSchema = z.object({
  PORT: z.coerce.number().optional(),
  CORS_ORIGIN: z.string().optional(),
});

const env = EnvSchema.parse(process.env);

export const config = {
  port: env.PORT ?? 3000,
  corsOrigin: env.CORS_ORIGIN ?? '*',
} as const;

