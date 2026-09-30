#!/usr/bin/env node
/**
 * Sube métricas diarias de un cliente a Firestore desde un CSV (Excel o Google Sheets).
 *
 *   npm run data:import -- --cliente clinica-sol --archivo datos/septiembre.csv [--prueba]
 */
import fs from "node:fs";
import { getFirebaseAdmin, args, c, clientBySlug, loadEnv } from "./lib/common.mjs";

const a = args();
if (!a.cliente || !a.archivo) {
  console.log("Uso: npm run data:import -- --cliente <slug> --archivo <ruta.csv> [--prueba]");
  process.exit(1);
}

const env = loadEnv();
const { db } = getFirebaseAdmin(env);
const client = await clientBySlug(db, String(a.cliente));

const raw = fs.readFileSync(String(a.archivo), "utf8").replace(/^\uFEFF/, "");
const lines = raw.split(/\r?\n/).filter((l) => l.trim());
const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ";" : ",";

function splitRow(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === sep && !q) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const header = splitRow(lines[0]).map(norm);
const col = (name) => header.indexOf(name);
const required = ["fecha", "canal"];
for (const r of required) {
  if (col(r) < 0) {
    c.err(`Falta la columna «${r}». Cabecera encontrada: ${header.join(", ")}`);
    process.exit(1);
  }
}

function number(v) {
  if (v === undefined || v === "") return 0;
  let s = v.replace(/\s|€/g, "");
  if (sep === ";") s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

let imported = 0;
const batch = db.batch();

for (let i = 1; i < lines.length; i++) {
  const row = splitRow(lines[i]);
  if (!row.some(Boolean)) continue;

  const fechaRaw = row[col("fecha")];
  const canal = (row[col("canal")] || "otros").toLowerCase().trim();

  // Parse fecha YYYY-MM-DD
  let fecha = fechaRaw;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaRaw)) {
    const [d, m, y] = fechaRaw.split("/");
    fecha = `${y}-${m}-${d}`;
  }

  const spend = number(row[col("gasto")]);
  const leads_1 = Math.round(number(row[col("nota1")]));
  const leads_2 = Math.round(number(row[col("nota2")]));
  const leads_3 = Math.round(number(row[col("nota3")]));
  const leads_4 = Math.round(number(row[col("nota4")]));
  const leads_5 = Math.round(number(row[col("nota5")]));
  const closed = Math.round(number(row[col("cerrados")]));
  const revenue = number(row[col("facturacion")]);

  const docId = `${client.id}_${fecha}_${canal}`;
  const ref = db.collection("daily_metrics").doc(docId);

  const payload = {
    client_id: client.id,
    date: fecha,
    channel: canal,
    spend,
    leads_1,
    leads_2,
    leads_3,
    leads_4,
    leads_5,
    closed,
    revenue,
  };

  if (a.prueba) {
    console.log(`[PRUEBA] Fila ${i}: ${fecha} · ${canal} · ${spend}€`);
  } else {
    batch.set(ref, payload, { merge: true });
  }
  imported++;
}

if (!a.prueba && imported > 0) {
  await batch.commit();
  c.ok(`Se han importado ${imported} registros a Firestore para ${client.name}.`);
} else {
  c.ok(`Validación de prueba completada (${imported} filas leídas).`);
}
