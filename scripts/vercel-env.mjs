#!/usr/bin/env node
/**
 * Copia las variables de .env.local a Vercel (production, preview y development).
 * Requiere haber hecho `npx vercel login` y `npx vercel link` en este directorio.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(ROOT, ".env.local");
if (!fs.existsSync(file)) {
  console.error("No existe .env.local. Ejecuta antes: npm run setup");
  process.exit(1);
}

const vars = {};
for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
for (const [k, v] of Object.entries(vars)) {
  for (const target of ["production", "preview", "development"]) {
    spawnSync(npx, ["vercel", "env", "rm", k, target, "--yes"], { cwd: ROOT, stdio: "ignore", shell: process.platform === "win32" });
    const r = spawnSync(npx, ["vercel", "env", "add", k, target], {
      cwd: ROOT,
      input: v,
      stdio: ["pipe", "ignore", "inherit"],
      shell: process.platform === "win32",
    });
    console.log(`${r.status === 0 ? "✓" : "✗"} ${k} → ${target}`);
  }
}
console.log("\nHecho. Vuelve a desplegar para aplicar: npx vercel --prod");
