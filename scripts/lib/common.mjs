/** Utilidades compartidas por los scripts de administración. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const c = {
  ok: (s) => console.log(`\x1b[32m✓\x1b[0m ${s}`),
  warn: (s) => console.log(`\x1b[33m!\x1b[0m ${s}`),
  err: (s) => console.error(`\x1b[31m✗\x1b[0m ${s}`),
  dim: (s) => console.log(`\x1b[2m  ${s}\x1b[0m`),
};

/** .env.local + variables del sistema (estas mandan). */
export function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  const env = {};
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return { ...env, ...Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(SUPABASE_|SMTP_|MAIL_|NEXT_PUBLIC_)/.test(k))) };
}

/** --clave valor  y  --bandera  →  { clave: "valor", bandera: true } */
export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) out[k] = true;
      else {
        out[k] = v;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

export function admin(env) {
  const url = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  if (!url || !env.SUPABASE_SERVICE_ROLE_KEY) {
    c.err("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. Ejecuta antes: npm run setup");
    process.exit(1);
  }
  return createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function clientBySlug(sb, slug) {
  const { data, error } = await sb.from("clients").select("id, name, slug, sector").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) {
    c.err(`No existe el cliente «${slug}». Créalo con: npm run client:add -- --empresa "Nombre" --email ...`);
    process.exit(1);
  }
  return data;
}

export const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
