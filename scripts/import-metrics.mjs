#!/usr/bin/env node
/**
 * Sube métricas diarias de un cliente desde un CSV (Excel o Google Sheets).
 *
 *   npm run data:import -- --cliente clinica-sol --archivo datos/septiembre.csv [--prueba]
 *
 * Columnas (cabecera obligatoria, el orden da igual):
 *   fecha, canal, gasto, nota1, nota2, nota3, nota4, nota5, cerrados, facturacion
 *
 * - fecha: 2026-09-01 o 01/09/2026
 * - canal: google, meta, lsa, linkedin, organico, otros… (texto libre en minúsculas)
 * - Separador «,» o «;». Con «;» (Excel en español) se acepta coma decimal: 58,40
 * - Si una fila (cliente + fecha + canal) ya existe, se sobrescribe: puedes volver a subir el mes entero.
 * - --prueba valida y muestra el resumen sin escribir nada.
 */
import fs from "node:fs";
import { admin, args, c, clientBySlug, loadEnv } from "./lib/common.mjs";

const a = args();
if (!a.cliente || !a.archivo) {
  console.log("Uso: npm run data:import -- --cliente <slug> --archivo <ruta.csv> [--prueba]");
  process.exit(1);
}

const raw = fs.readFileSync(String(a.archivo), "utf8").replace(/^﻿/, "");
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

function number(v, row, field, decimals) {
  if (v === undefined || v === "") return 0;
  let s = v.replace(/\s|€/g, "");
  if (sep === ";") s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || (!decimals && !Number.isInteger(n))) {
    throw new Error(`Fila ${row}: «${field}» no es válido (${v}).`);
  }
  return n;
}

function date(v, row) {
  let iso = "";
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) iso = `${m[1]}-${m[2]}-${m[3]}`;
  m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  // Comprueba que la fecha existe (nada de 31/02 o mes 13).
  const d = new Date(iso + "T00:00:00Z");
  if (!iso || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) {
    throw new Error(`Fila ${row}: fecha no válida (${v}). Usa 2026-09-01 o 01/09/2026.`);
  }
  return iso;
}

const rows = [];
const errors = [];
for (let i = 1; i < lines.length; i++) {
  const r = splitRow(lines[i]);
  const get = (k) => (col(k) >= 0 ? r[col(k)] : "");
  try {
    rows.push({
      date: date(get("fecha"), i + 1),
      channel: norm(get("canal")) || "otros",
      spend: number(get("gasto"), i + 1, "gasto", true),
      leads_1: number(get("nota1"), i + 1, "nota1"),
      leads_2: number(get("nota2"), i + 1, "nota2"),
      leads_3: number(get("nota3"), i + 1, "nota3"),
      leads_4: number(get("nota4"), i + 1, "nota4"),
      leads_5: number(get("nota5"), i + 1, "nota5"),
      closed: number(get("cerrados"), i + 1, "cerrados"),
      revenue: number(get("facturacion"), i + 1, "facturacion", true),
    });
  } catch (e) {
    errors.push(e.message);
  }
}

if (errors.length) {
  errors.slice(0, 20).forEach((e) => c.err(e));
  if (errors.length > 20) c.err(`…y ${errors.length - 20} errores más.`);
  c.err("No se ha subido nada. Corrige el archivo y vuelve a intentarlo.");
  process.exit(1);
}

// Duplicados dentro del propio archivo
const keys = new Set();
for (const r of rows) {
  const k = `${r.date}|${r.channel}`;
  if (keys.has(k)) {
    c.err(`Fila duplicada en el archivo: ${r.date} · ${r.channel}`);
    process.exit(1);
  }
  keys.add(k);
}

const sum = rows.reduce(
  (t, r) => ({
    spend: t.spend + r.spend,
    leads: t.leads + r.leads_1 + r.leads_2 + r.leads_3 + r.leads_4 + r.leads_5,
    hot: t.hot + r.leads_4 + r.leads_5,
  }),
  { spend: 0, leads: 0, hot: 0 },
);
const dates = rows.map((r) => r.date).sort();
c.ok(`${rows.length} filas válidas · ${dates[0]} → ${dates.at(-1)} · canales: ${[...new Set(rows.map((r) => r.channel))].join(", ")}`);
c.dim(`Inversión ${sum.spend.toFixed(2)} € · ${sum.leads} leads · ${sum.hot} de nota 4–5`);

if (a.prueba) {
  c.warn("Modo prueba: no se ha escrito nada.");
  process.exit(0);
}

const sb = admin(loadEnv());
const client = await clientBySlug(sb, String(a.cliente));
for (let i = 0; i < rows.length; i += 500) {
  const batch = rows.slice(i, i + 500).map((r) => ({ ...r, client_id: client.id }));
  const { error } = await sb.from("daily_metrics").upsert(batch, { onConflict: "client_id,date,channel" });
  if (error) {
    c.err(`Error subiendo filas ${i + 1}–${i + batch.length}: ${error.message}`);
    process.exit(1);
  }
}
c.ok(`Subido a ${client.name}. Ya se ve en su área de clientes.`);
