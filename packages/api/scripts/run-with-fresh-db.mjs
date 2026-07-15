import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync, spawn } from "node:child_process";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(__dirname, "..");
const dbName = process.argv[2] ?? "test";
const mode = process.argv[3] ?? "test";
const dbPath = path.resolve(apiDir, "../core/prisma", `${dbName}.sqlite`);

fs.rmSync(dbPath, { force: true });

const env = { ...process.env, DATABASE_URL: `file:${dbPath}` };

execSync("npx prisma migrate deploy --schema=../core/prisma/schema.prisma", {
  cwd: apiDir,
  env,
  stdio: "inherit",
});

if (mode === "serve") {
  const child = spawn("npx", ["tsx", "src/server.ts"], {
    cwd: apiDir,
    env,
    stdio: "inherit",
  });
  child.on("exit", (code) => process.exit(code ?? 0));
} else {
  execSync("npx vitest run", {
    cwd: apiDir,
    env,
    stdio: "inherit",
  });
}
