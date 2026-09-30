#!/usr/bin/env node
/**
 * Alta de clientes y usuarios del área de clientes en Firebase.
 *
 *   npm run client:add -- --empresa "Clínica Sol" --email ana@clinicasol.es --nombre "Ana Ruiz" [--sector "Clínica o centro"] [--slug clinica-sol] [--rol owner|member] [--sin-email]
 *   npm run client:list
 */
import nodemailer from "nodemailer";
import { getFirebaseAdmin, args, c, loadEnv, slugify } from "./lib/common.mjs";

const env = loadEnv();
const a = args();
const cmd = a._[0];
const { db, auth } = getFirebaseAdmin(env);
const SITE = (env.NEXT_PUBLIC_SITE_URL || "https://estudiodigitalpro.com").replace(/\/$/, "");

if (cmd === "list") {
  const clientsSnap = await db.collection("clients").orderBy("name").get();
  if (clientsSnap.empty) {
    c.warn("Aún no hay clientes.");
    process.exit(0);
  }

  for (const doc of clientsSnap.docs) {
    const cl = doc.data();
    console.log(`\n\x1b[1m${cl.name}\x1b[0m  (${cl.slug})  ${cl.sector || ""}`);
    const membersSnap = await db.collection("client_members").where("client_id", "==", doc.id).get();
    for (const mDoc of membersSnap.docs) {
      const m = mDoc.data();
      let email = m.user_id;
      try {
        const u = await auth.getUser(m.user_id);
        email = u.email || email;
      } catch {}
      console.log(`  · ${m.full_name || "—"} <${email}>  ${m.role}`);
    }
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
let clientDoc;
const existingClientSnap = await db.collection("clients").where("slug", "==", slug).limit(1).get();
if (existingClientSnap.empty) {
  const newRef = db.collection("clients").doc();
  await newRef.set({
    name: empresa,
    slug,
    sector: String(a.sector || ""),
    created_at: new Date().toISOString(),
  });
  clientDoc = { id: newRef.id, name: empresa, slug };
  c.ok(`Cliente creado en Firebase: ${empresa} (${slug})`);
} else {
  const d = existingClientSnap.docs[0];
  clientDoc = { id: d.id, ...d.data() };
  c.ok(`Cliente existente: ${clientDoc.name} (${slug})`);
}

// 2 · Usuario en Firebase Auth
let user;
let isNewUser = false;
try {
  user = await auth.getUserByEmail(email);
} catch {
  // Crear usuario
  user = await auth.createUser({
    email,
    displayName: nombre,
  });
  isNewUser = true;
}

// 3 · Membresía en client_members
const memberId = `${user.uid}_${clientDoc.id}`;
await db.collection("client_members").doc(memberId).set(
  {
    user_id: user.uid,
    client_id: clientDoc.id,
    full_name: nombre,
    role: rol,
    created_at: new Date().toISOString(),
  },
  { merge: true }
);

c.ok(`Acceso asignado: ${email} → ${clientDoc.name} (${rol})`);

// 4 · Enlace de acceso o contraseña
try {
  const resetLink = await auth.generatePasswordResetLink(email);
  if (isNewUser) {
    console.log(`\nEnlace para crear contraseña: ${resetLink}\n`);
  }
} catch (e) {
  console.log(`No se pudo generar enlace de reset: ${e.message}`);
}
