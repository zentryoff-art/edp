#!/usr/bin/env node
/**
 * Puesta en marcha de Estudio Digital Pro contra tu proyecto de Supabase.
 *
 *   npm run setup            → pregunta lo que falte y lo guarda en .env.local
 *   npm run setup -- --yes   → no pregunta; usa .env.local y las variables del sistema
 *
 * Pasos: variables → tablas (supabase/migrations) → vídeo a Storage → comprobaciones → correo de prueba.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import pg from "pg";
import nodemailer from "nodemailer";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = path.join(ROOT, ".env.local");
const YES = process.argv.includes("--yes") || process.argv.includes("-y");

const c = {
  ok: (s) => console.log(`\x1b[32m✓\x1b[0m ${s}`),
  warn: (s) => console.log(`\x1b[33m!\x1b[0m ${s}`),
  err: (s) => console.log(`\x1b[31m✗\x1b[0m ${s}`),
  step: (s) => console.log(`\n\x1b[1m${s}\x1b[0m`),
  dim: (s) => console.log(`\x1b[2m  ${s}\x1b[0m`),
};

// ── .env.local ────────────────────────────────

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

function writeEnv(file, vars) {
  const groups = [
    ["# Supabase", ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_DB_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]],
    ["# Correo (SMTP)", ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "MAIL_FROM", "MAIL_TO"]],
    ["# Contacto público", ["NEXT_PUBLIC_CONTACT_EMAIL", "NEXT_PUBLIC_CONTACT_PHONE", "NEXT_PUBLIC_SITE_URL"]],
    ["# Vídeo (Supabase Storage)", ["NEXT_PUBLIC_VIDEO_URL", "NEXT_PUBLIC_VIDEO_POSTER_URL"]],
    [
      "# Agenda",
      ["BOOKING_TIMEZONE", "BOOKING_SLOT_MINUTES", "BOOKING_HOURS", "BOOKING_MIN_NOTICE_MINUTES", "BOOKING_HORIZON_DAYS", "BOOKING_CLOSED_DATES"],
    ],
  ];
  const known = new Set(groups.flatMap(([, k]) => k));
  const q = (v) => (/[\s#"';]/.test(v) ? `"${v.replace(/"/g, '\\"')}"` : v);
  let out = "# Generado por npm run setup. No subir a git.\n";
  for (const [title, keys] of groups) {
    out += `\n${title}\n`;
    for (const k of keys) if (vars[k] !== undefined && vars[k] !== "") out += `${k}=${q(vars[k])}\n`;
  }
  const extra = Object.keys(vars).filter((k) => !known.has(k) && vars[k] !== "");
  if (extra.length) {
    out += "\n# Otras\n";
    for (const k of extra) out += `${k}=${q(vars[k])}\n`;
  }
  fs.writeFileSync(file, out);
}

// ── Preguntas ─────────────────────────────────

const rl = YES ? null : readline.createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
// Iterador de líneas: guarda en cola las respuestas aunque lleguen de golpe (stdin canalizado).
const lines = rl?.[Symbol.asyncIterator]();
let muted = false;
if (rl && process.stdin.isTTY) {
  const write = rl._writeToOutput.bind(rl);
  rl._writeToOutput = (s) => write(muted && !/[\r\n]/.test(s) ? "*".repeat(s.length ? 1 : 0) : s);
}

async function ask(label, def = "", { secret = false } = {}) {
  if (YES) return def;
  const shown = def ? (secret ? " [guardado]" : ` [${def}]`) : "";
  process.stdout.write(`  ${label}${shown}: `);
  muted = secret;
  const { value, done } = await lines.next();
  muted = false;
  if (!process.stdin.isTTY) process.stdout.write("\n");
  return (done ? "" : String(value)).trim() || def;
}

// ── Main ──────────────────────────────────────

const env = { ...readEnv(ENV_FILE) };
for (const k of Object.keys(process.env)) {
  if (/^(SUPABASE_|SMTP_|MAIL_|NEXT_PUBLIC_|BOOKING_)/.test(k) && !env[k]) env[k] = process.env[k];
}

console.log("\n\x1b[1m■■■■\x1b[38;5;202m■\x1b[0m\x1b[1m Estudio Digital Pro · setup\x1b[0m");

c.step("1 · Supabase");
c.dim("Supabase → Project Settings → API (URL, anon/publishable key y service_role key)");
c.dim("Supabase → Connect → Connection string (URI, con la contraseña de la base de datos)");
env.SUPABASE_URL = (await ask("SUPABASE_URL", env.SUPABASE_URL)).replace(/\/$/, "");
env.NEXT_PUBLIC_SUPABASE_ANON_KEY = await ask("Clave anon/publishable (área de clientes)", env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
env.SUPABASE_SERVICE_ROLE_KEY = await ask("SUPABASE_SERVICE_ROLE_KEY", env.SUPABASE_SERVICE_ROLE_KEY, { secret: true });
env.SUPABASE_DB_URL = await ask("SUPABASE_DB_URL", env.SUPABASE_DB_URL, { secret: true });
if (!/^https:\/\/.+/.test(env.SUPABASE_URL || "") || !env.SUPABASE_SERVICE_ROLE_KEY) {
  rl?.close();
  c.err("Faltan SUPABASE_URL (https://…supabase.co) o SUPABASE_SERVICE_ROLE_KEY. Sin ellos la web no puede guardar nada.");
  process.exit(1);
}
env.NEXT_PUBLIC_SUPABASE_URL = env.SUPABASE_URL;
if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY) c.warn("Sin clave anon/publishable el área de clientes no podrá iniciar sesión.");

c.step("2 · Correo (SMTP) para reenviar formularios y reservas");
c.dim("Datos del proveedor de info@estudiodigitalpro.com (Google Workspace, Zoho, Hostinger, Resend…)");
env.SMTP_HOST = await ask("SMTP_HOST", env.SMTP_HOST);
env.SMTP_PORT = await ask("SMTP_PORT", env.SMTP_PORT || "465");
env.SMTP_SECURE = env.SMTP_PORT === "465" ? "true" : env.SMTP_SECURE || "false";
env.SMTP_USER = await ask("SMTP_USER", env.SMTP_USER || "info@estudiodigitalpro.com");
env.SMTP_PASS = await ask("SMTP_PASS", env.SMTP_PASS, { secret: true });
env.MAIL_TO = await ask("Enviar avisos a (MAIL_TO)", env.MAIL_TO || "info@estudiodigitalpro.com");
env.MAIL_FROM = env.MAIL_FROM || `Estudio Digital Pro <${env.SMTP_USER || "info@estudiodigitalpro.com"}>`;

env.NEXT_PUBLIC_CONTACT_EMAIL ||= "info@estudiodigitalpro.com";
env.NEXT_PUBLIC_CONTACT_PHONE ||= "+34643168396";
env.NEXT_PUBLIC_SITE_URL ||= "https://estudiodigitalpro.com";
env.BOOKING_TIMEZONE ||= "Europe/Madrid";
env.BOOKING_SLOT_MINUTES ||= "20";
env.BOOKING_HOURS ||= "1-4=09:00-14:00,16:00-19:00;5=09:00-14:00";
env.BOOKING_MIN_NOTICE_MINUTES ||= "120";
env.BOOKING_HORIZON_DAYS ||= "28";

writeEnv(ENV_FILE, env);
c.ok(`Variables guardadas en .env.local`);

let failures = 0;

// ── Tablas ────────────────────────────────────
c.step("3 · Tablas en Supabase");
if (!env.SUPABASE_DB_URL) {
  c.warn("Sin SUPABASE_DB_URL: ejecuta a mano supabase/migrations/*.sql en el SQL Editor de Supabase.");
} else {
  const client = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const dir = path.join(ROOT, "supabase", "migrations");
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      await client.query(fs.readFileSync(path.join(dir, f), "utf8"));
      c.ok(`Migración ${f}`);
    }
  } catch (e) {
    failures++;
    c.err(`No se pudieron crear las tablas: ${e.message}`);
    c.dim("Revisa SUPABASE_DB_URL (usa la cadena «Session pooler» si tu red no tiene IPv6).");
  } finally {
    await client.end().catch(() => {});
  }
}

// ── Vídeo a Storage ───────────────────────────
c.step("4 · Vídeo a Supabase Storage");
const sbHeaders = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
const media = [
  ["edp-llamada.mp4", "video/mp4", "NEXT_PUBLIC_VIDEO_URL"],
  ["edp-llamada-poster.jpg", "image/jpeg", "NEXT_PUBLIC_VIDEO_POSTER_URL"],
];
for (const [name, type, key] of media) {
  const file = path.join(ROOT, "public", "video", name);
  if (!fs.existsSync(file)) {
    c.warn(`No existe public/video/${name}; se omite.`);
    continue;
  }
  try {
    const res = await fetch(`${env.SUPABASE_URL}/storage/v1/object/media/${name}`, {
      method: "POST",
      headers: { ...sbHeaders, "Content-Type": type, "x-upsert": "true", "Cache-Control": "max-age=31536000" },
      body: fs.readFileSync(file),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    env[key] = `${env.SUPABASE_URL}/storage/v1/object/public/media/${name}`;
    c.ok(`Subido ${name}`);
  } catch (e) {
    failures++;
    c.err(`No se pudo subir ${name}: ${e.message}`);
  }
}
writeEnv(ENV_FILE, env);

// ── Comprobaciones ────────────────────────────
c.step("5 · Comprobaciones");
for (const table of ["bookings", "contact_requests", "blocked_dates", "clients", "client_members", "daily_metrics", "reports", "incidents", "incident_messages"]) {
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, { headers: sbHeaders });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    c.ok(`Supabase responde: ${table}`);
  } catch (e) {
    failures++;
    c.err(`Supabase ${table}: ${e.message}`);
  }
}

let transport = null;
if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
  transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: env.SMTP_SECURE === "true",
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
  });
  try {
    await transport.verify();
    c.ok("SMTP acepta las credenciales");
  } catch (e) {
    failures++;
    transport = null;
    c.err(`SMTP: ${e.message}`);
  }
} else {
  failures++;
  c.warn("SMTP sin configurar: los formularios se guardan en Supabase pero no llegan al correo.");
}

if (transport && !YES) {
  console.log("");
  const a = await ask(`¿Enviar un correo de prueba a ${env.MAIL_TO}? (s/N)`);
  if (/^s/i.test(a.trim())) {
    try {
      await transport.sendMail({
        from: env.MAIL_FROM,
        to: env.MAIL_TO,
        subject: "Prueba · Estudio Digital Pro",
        text: "Si lees esto, los formularios y reservas de la web llegarán a este buzón.",
      });
      c.ok("Correo de prueba enviado");
    } catch (e) {
      failures++;
      c.err(`Correo de prueba: ${e.message}`);
    }
  }
}

// ── Resumen ───────────────────────────────────
c.step("Listo");
if (failures) c.warn(`${failures} paso(s) con avisos. Revísalos arriba y vuelve a lanzar npm run setup.`);
else c.ok("Todo configurado.");
console.log(`
  En local:        npm run dev   → http://localhost:3000/llamada
  En producción:   npm run build && npm start
  En Vercel:       copia las variables de .env.local (menos SUPABASE_DB_URL) en
                   Project → Settings → Environment Variables, o ejecuta:
                   npm run env:vercel
`);
rl?.close();
process.exit(failures ? 1 : 0);
