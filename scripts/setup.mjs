#!/usr/bin/env node
/**
 * Comprobación de configuración de Firebase y correo SMTP.
 *
 *   npm run setup
 */
import { getFirebaseAdmin, c, loadEnv } from "./lib/common.mjs";
import nodemailer from "nodemailer";

const env = loadEnv();

c.step("1 · Comprobando Firebase");
try {
  const { db, auth } = getFirebaseAdmin(env);
  const snap = await db.collection("blocked_dates").limit(1).get();
  c.ok(`Conexión con Firestore confirmada (proyecto: ${env.FIREBASE_PROJECT_ID}).`);
  c.ok(`Colección blocked_dates legible (${snap.empty ? "vacía" : "con registros"}).`);
} catch (e) {
  c.err(`Error al conectar con Firebase: ${e.message}`);
}

c.step("2 · Comprobando Correo SMTP");
if (env.SMTP_USER && env.SMTP_PASS) {
  try {
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST || "smtp.gmail.com",
      port: Number(env.SMTP_PORT) || 465,
      secure: env.SMTP_PORT === "465" || env.SMTP_SECURE === "true",
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
    await transport.verify();
    c.ok("Servidor SMTP verificado.");
  } catch (e) {
    c.warn(`Aviso SMTP: ${e.message}`);
  }
} else {
  c.dim("SMTP no configurado completamente (opcional).");
}

c.step("3 · Listo");
c.ok("Todo configurado con Firebase.");
