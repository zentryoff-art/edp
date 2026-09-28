#!/usr/bin/env node
/**
 * Alta de clientes y usuarios del área de clientes.
 *
 *   npm run client:add -- --empresa "Clínica Sol" --email ana@clinicasol.es --nombre "Ana Ruiz" [--sector "Clínica o centro"] [--slug clinica-sol] [--rol owner|member] [--sin-email]
 *   npm run client:list
 *
 * - Crea el cliente si no existe (por slug) y le asocia el usuario.
 * - Usuario nuevo: le envía por correo el enlace para crear su contraseña.
 * - Usuario que ya existía: solo le da acceso (entra con su contraseña de siempre).
 * - Sin SMTP o con --sin-email, el enlace se muestra aquí para enviarlo a mano.
 */
import nodemailer from "nodemailer";
import { admin, args, c, loadEnv, slugify } from "./lib/common.mjs";

const env = loadEnv();
const a = args();
const cmd = a._[0];
const sb = admin(env);
const SITE = (env.NEXT_PUBLIC_SITE_URL || "https://estudiodigitalpro.com").replace(/\/$/, "");

if (cmd === "list") {
  const { data: clients, error } = await sb.from("clients").select("id, name, slug, sector, client_members (full_name, role, user_id)").order("name");
  if (error) throw error;
  const { data: users } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const email = new Map((users?.users || []).map((u) => [u.id, u.email]));
  if (!clients.length) c.warn("Aún no hay clientes.");
  for (const cl of clients) {
    console.log(`\n\x1b[1m${cl.name}\x1b[0m  (${cl.slug})  ${cl.sector || ""}`);
    for (const m of cl.client_members) console.log(`  · ${m.full_name || "—"} <${email.get(m.user_id) || m.user_id}>  ${m.role}`);
  }
  process.exit(0);
}

if (cmd !== "add") {
  console.log('Uso:\n  npm run client:add -- --empresa "Nombre" --email persona@empresa.com --nombre "Nombre Apellido"\n  npm run client:list');
  process.exit(1);
}

const empresa = String(a.empresa || "").trim();
const email = String(a.email || "").trim().toLowerCase();
const nombre = String(a.nombre || "").trim();
const slug = String(a.slug || slugify(empresa));
const rol = a.rol === "member" ? "member" : "owner";
if (!empresa || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  c.err('Faltan --empresa y un --email válido. Ejemplo: npm run client:add -- --empresa "Clínica Sol" --email ana@clinicasol.es --nombre "Ana Ruiz"');
  process.exit(1);
}

// 1 · Cliente
let { data: client } = await sb.from("clients").select("id, name, slug").eq("slug", slug).maybeSingle();
if (!client) {
  const { data, error } = await sb.from("clients").insert({ name: empresa, slug, sector: String(a.sector || "") }).select("id, name, slug").single();
  if (error) throw error;
  client = data;
  c.ok(`Cliente creado: ${client.name} (${client.slug})`);
} else c.ok(`Cliente existente: ${client.name} (${client.slug})`);

// 2 · Usuario: invitación si es nuevo
let userId;
let link = null;
const invite = await sb.auth.admin.generateLink({ type: "invite", email, options: { data: { full_name: nombre } } });
if (!invite.error) {
  userId = invite.data.user.id;
  link = `${SITE}/clientes/auth/confirm?type=invite&token_hash=${encodeURIComponent(invite.data.properties.hashed_token)}`;
  c.ok(`Usuario creado: ${email}`);
} else if (/already|registered|exists/i.test(invite.error.message)) {
  const ml = await sb.auth.admin.generateLink({ type: "magiclink", email });
  if (ml.error) throw ml.error;
  userId = ml.data.user.id;
  c.ok(`El usuario ${email} ya existía: se le da acceso a ${client.name}.`);
} else {
  throw invite.error;
}

// 3 · Membresía
const { error: mErr } = await sb.from("client_members").upsert({ user_id: userId, client_id: client.id, full_name: nombre, role: rol }, { onConflict: "user_id,client_id" });
if (mErr) throw mErr;
c.ok(`Acceso concedido (${rol}).`);

// 4 · Correo
const smtp = env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS;
if (a["sin-email"] || !smtp) {
  if (!smtp) c.warn("SMTP sin configurar: envía tú el enlace.");
  if (link) {
    console.log(`\n  Enlace para crear la contraseña (un solo uso):\n  ${link}\n`);
  } else {
    console.log(`\n  Puede entrar con su contraseña en ${SITE}/clientes/login\n`);
  }
  process.exit(0);
}

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT || 465),
  secure: (env.SMTP_SECURE || (Number(env.SMTP_PORT || 465) === 465 ? "true" : "false")) === "true",
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  connectionTimeout: 10000,
});
const from = env.MAIL_FROM || `Estudio Digital Pro <${env.SMTP_USER}>`;
const esc = (v) => String(v).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const hi = nombre ? `Hola ${esc(nombre.split(" ")[0])},` : "Hola,";
const button = (href, text) =>
  `<a href="${href}" style="display:inline-block;background:#E75623;color:#16140F;font-weight:bold;text-decoration:none;padding:14px 20px">${text}</a>`;
const body = link
  ? `<p>${hi}</p><p>Ya tienes acceso al área de clientes de Estudio Digital Pro para <b>${esc(client.name)}</b>: tus informes, tus llamadas y tus incidencias en un solo sitio.</p><p>${button(link, "Crear mi contraseña")}</p><p style="color:#58554F;font-size:13px">El enlace solo funciona una vez y caduca pronto. Si caduca, usa «¿Has olvidado tu contraseña?» en ${SITE}/clientes/login.</p>`
  : `<p>${hi}</p><p>Te hemos dado acceso a <b>${esc(client.name)}</b> en el área de clientes. Entra con tu email y tu contraseña de siempre.</p><p>${button(`${SITE}/clientes/login`, "Entrar")}</p>`;

await transport.sendMail({
  from,
  to: email,
  subject: "Tu acceso al área de clientes · Estudio Digital Pro",
  html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#16140F;font-size:16px;line-height:1.5;max-width:520px">${body}</div>`,
});
c.ok(`Correo enviado a ${email}.`);
