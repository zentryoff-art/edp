/**
 * Envío de correos por SMTP (variables SMTP_*). Si no está configurado, se
 * registra un aviso y la petición sigue adelante: los datos ya están en Supabase.
 */
import nodemailer, { type SendMailOptions } from "nodemailer";
import { CONTACT } from "./contact";

const env = process.env;

export const mailConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
const configured = mailConfigured;

const transporter = configured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 465),
      secure: (env.SMTP_SECURE ?? (Number(env.SMTP_PORT || 465) === 465 ? "true" : "false")) === "true",
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })
  : null;

const FROM = env.MAIL_FROM || `Estudio Digital Pro <${CONTACT.email}>`;
const TEAM = env.MAIL_TO || CONTACT.email;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#F8F7F4;font-family:Arial,Helvetica,sans-serif;color:#16140F">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F7F4;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #DFDEDB">
<tr><td style="padding:24px 28px;border-bottom:1px solid #DFDEDB">
<span style="display:inline-block;width:6px;height:6px;background:#16140F;margin-right:2px"></span><span style="display:inline-block;width:6px;height:6px;background:#16140F;margin-right:2px"></span><span style="display:inline-block;width:6px;height:6px;background:#16140F;margin-right:2px"></span><span style="display:inline-block;width:6px;height:6px;background:#16140F;margin-right:2px"></span><span style="display:inline-block;width:6px;height:6px;background:#E75623;margin-right:10px"></span><strong style="font-size:15px">Estudio Digital Pro</strong>
</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 18px;font-size:22px;line-height:1.2">${title}</h1>
${body}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #DFDEDB;font-size:12px;color:#58554F">
Estudio Digital Pro · <a href="mailto:${CONTACT.email}" style="color:#58554F">${CONTACT.email}</a> · <a href="tel:${CONTACT.phone}" style="color:#58554F">${CONTACT.phoneDisplay}</a>
</td></tr></table></td></tr></table></body></html>`;
}

function table(rows: [string, string][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">${rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px 8px 0;border-bottom:1px solid #DFDEDB;color:#58554F;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #DFDEDB">${esc(v).replace(/\n/g, "<br>")}</td></tr>`,
    )
    .join("")}</table>`;
}

async function send(opts: SendMailOptions) {
  if (!transporter) {
    console.warn(`[mail] SMTP no configurado. No se envía: "${opts.subject}" → ${opts.to}`);
    return false;
  }
  try {
    await transporter.sendMail({ from: FROM, ...opts });
    return true;
  } catch (err) {
    console.error("[mail] Error enviando", opts.subject, err);
    return false;
  }
}

// ── Formulario de contacto / auditoría ────────

export function notifyContactRequest(r: {
  name: string;
  company: string;
  email: string;
  phone: string;
  sector: string;
  message: string;
  source: string;
}) {
  return send({
    to: TEAM,
    replyTo: r.email,
    subject: `Nueva solicitud de mes de prueba · ${r.company}`,
    html: layout(
      "Nueva solicitud de mes de prueba",
      table([
        ["Nombre", r.name],
        ["Empresa", r.company],
        ["Email", r.email],
        ["Teléfono", r.phone],
        ["Sector", r.sector],
        ["Mensaje", r.message],
        ["Origen", r.source],
      ]),
    ),
    text: `Nueva solicitud de mes de prueba\n\nNombre: ${r.name}\nEmpresa: ${r.company}\nEmail: ${r.email}\nTeléfono: ${r.phone}\nSector: ${r.sector}\nMensaje: ${r.message}`,
  });
}

// ── Reservas ──────────────────────────────────

type BookingMail = {
  id: string;
  starts_at: string;
  ends_at: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  sector: string;
  ad_spend: string;
  website: string;
  notes: string;
  whenText: string; // "martes, 29 de septiembre a las 10:00 (Europe/Madrid)"
};

const stamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function ics(b: BookingMail, method: "REQUEST" | "PUBLISH") {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Estudio Digital Pro//Reservas//ES",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${b.id}@estudiodigitalpro.com`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(b.starts_at)}`,
    `DTEND:${stamp(b.ends_at)}`,
    `SUMMARY:Llamada · Estudio Digital Pro${method === "PUBLISH" ? ` · ${b.company}` : ""}`,
    `DESCRIPTION:Llamada de 20 minutos. Teléfono: ${b.phone}`,
    `ORGANIZER;CN=Estudio Digital Pro:mailto:${CONTACT.email}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Llamada con Estudio Digital Pro",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function notifyBooking(b: BookingMail) {
  const team = send({
    to: TEAM,
    replyTo: b.email,
    subject: `Nueva llamada reservada · ${b.whenText} · ${b.company}`,
    html: layout(
      "Nueva llamada reservada",
      `<p style="margin:0 0 16px;font-size:16px"><strong>${esc(b.whenText)}</strong></p>` +
        table([
          ["Nombre", b.name],
          ["Empresa", b.company],
          ["Email", b.email],
          ["Teléfono", b.phone],
          ["Sector", b.sector],
          ["Inversión en anuncios", b.ad_spend],
          ["Web", b.website],
          ["Qué quiere resolver", b.notes],
        ]),
    ),
    icalEvent: { method: "PUBLISH", filename: "llamada.ics", content: ics(b, "PUBLISH") },
  });

  const client = send({
    to: b.email,
    replyTo: CONTACT.email,
    subject: `Llamada confirmada · ${b.whenText}`,
    html: layout(
      "Tu llamada está confirmada",
      `<p style="margin:0 0 14px;font-size:16px;line-height:1.5">Hola ${esc(b.name.split(" ")[0])},</p>
<p style="margin:0 0 14px;font-size:16px;line-height:1.5">Te llamamos el <strong>${esc(b.whenText)}</strong> al ${esc(b.phone)}. Son 20 minutos: vemos cómo captas clientes hoy y te decimos, con cifras, qué cambiaríamos.</p>
<p style="margin:0 0 14px;font-size:16px;line-height:1.5">Si necesitas cambiar la hora, responde a este correo o llámanos al <a href="tel:${CONTACT.phone}" style="color:#16140F">${CONTACT.phoneDisplay}</a>.</p>`,
    ),
    icalEvent: { method: "REQUEST", filename: "invitacion.ics", content: ics(b, "REQUEST") },
  });

  return Promise.all([team, client]);
}

// ── Área de clientes ──────────────────────────

export function notifyIncident(i: {
  id: string;
  client: string;
  author: string;
  authorEmail: string;
  title: string;
  description: string;
  category: string;
  priority: string;
}) {
  return send({
    to: TEAM,
    replyTo: i.authorEmail,
    subject: `${i.priority === "urgente" ? "[URGENTE] " : ""}Nueva incidencia · ${i.client} · ${i.title}`,
    html: layout(
      "Nueva incidencia en el área de clientes",
      table([
        ["Cliente", i.client],
        ["Abierta por", `${i.author} <${i.authorEmail}>`],
        ["Título", i.title],
        ["Categoría", i.category],
        ["Prioridad", i.priority],
        ["Descripción", i.description],
        ["ID", i.id],
      ]) +
        `<p style="margin:18px 0 0;font-size:13px;color:#58554F">Para responder, añade un mensaje con is_team = true en la tabla incident_messages de Supabase y cambia el estado en incidents.</p>`,
    ),
  });
}

export function notifyIncidentReply(m: { incidentId: string; client: string; author: string; authorEmail: string; title: string; body: string }) {
  return send({
    to: TEAM,
    replyTo: m.authorEmail,
    subject: `Nuevo mensaje · ${m.client} · ${m.title}`,
    html: layout(
      `Nuevo mensaje en «${esc(m.title)}»`,
      table([
        ["Cliente", m.client],
        ["De", `${m.author} <${m.authorEmail}>`],
        ["Mensaje", m.body],
        ["ID incidencia", m.incidentId],
      ]),
    ),
  });
}

/** Enlace de acceso: invitación al área o recuperación de contraseña. */
export function sendAccessLink(to: string, url: string, kind: "invite" | "recovery", name = "") {
  const hi = name ? `Hola ${esc(name.split(" ")[0])},` : "Hola,";
  const invite = kind === "invite";
  return send({
    to,
    replyTo: CONTACT.email,
    subject: invite ? "Tu acceso al área de clientes · Estudio Digital Pro" : "Cambia tu contraseña · Estudio Digital Pro",
    html: layout(
      invite ? "Tu área de clientes está lista" : "Cambia tu contraseña",
      `<p style="margin:0 0 14px;font-size:16px;line-height:1.5">${hi}</p>
<p style="margin:0 0 20px;font-size:16px;line-height:1.5">${
        invite
          ? "Desde el área de clientes puedes ver tus informes, pedir una llamada y abrirnos incidencias. Crea tu contraseña para entrar:"
          : "Hemos recibido una petición para cambiar tu contraseña. Si no has sido tú, ignora este correo."
      }</p>
<p style="margin:0 0 20px"><a href="${esc(url)}" style="display:inline-block;background:#E75623;color:#16140F;font-weight:bold;text-decoration:none;padding:14px 20px">${
        invite ? "Crear mi contraseña" : "Elegir nueva contraseña"
      }</a></p>
<p style="margin:0;font-size:13px;color:#58554F">El enlace solo funciona una vez y caduca pronto. Si ha caducado, pide otro en «¿Has olvidado tu contraseña?» de la página de acceso.</p>`,
    ),
    text: `${invite ? "Crea tu contraseña" : "Cambia tu contraseña"}: ${url}`,
  });
}
