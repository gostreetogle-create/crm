import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.resolve(backendRoot, ".env");

function checkEnvFile(): string[] {
  const problems: string[] = [];
  if (!process.env.DATABASE_URL?.trim() && !fs.existsSync(envPath)) {
    problems.push(`missing DATABASE_URL and ${envPath}`);
  }
  return problems;
}

function checkNodeModules(): string[] {
  const problems: string[] = [];
  const nodeModules = path.resolve(backendRoot, "node_modules");
  if (!fs.existsSync(nodeModules)) {
    problems.push("missing node_modules (run: npm install)");
  }

  const required = [
    path.resolve(nodeModules, "multer"),
    path.resolve(nodeModules, "@types", "multer"),
    path.resolve(nodeModules, ".prisma", "client"),
  ];
  for (const p of required) {
    if (!fs.existsSync(p)) {
      problems.push(`missing dependency artifact: ${p}`);
    }
  }
  return problems;
}

function main(): void {
  const problems = [...checkEnvFile(), ...checkNodeModules()];
  if (problems.length > 0) {
    console.error("[backend:doctor] FAILED");
    for (const p of problems) console.error(`- ${p}`);
    process.exitCode = 1;
    return;
  }
  console.log("[backend:doctor] OK");
}

main();
