#!/usr/bin/env node
/**
 * Crea o actualiza el texto del informe mensual de un cliente.
 * Las cifras salen solas de las métricas diarias; aquí va lo que contáis vosotros.
 *
 *   npm run data:report -- --cliente clinica-sol --mes 2026-09 --archivo informes/sol-2026-09.md [--publicar] [--pdf https://…]
 *   npm run data:report -- --cliente clinica-sol --mes 2026-09 --despublicar
 *
 * Formato del archivo (ver datos/plantillas/informe.md):
 *   # Título del mes
 *   ## Resumen
 *   Texto…
 *   ## Lo que ha pasado
 *   - punto
 *   ## Próximos pasos
 *   - punto
 *
 * Sin --publicar se guarda como borrador (el cliente no lo ve).
 */
import fs from "node:fs";
import { admin, args, c, clientBySlug, loadEnv } from "./lib/common.mjs";

/** Lector sencillo: «# Título» y bloques «## Sección». */
export function parseReport(md) {
  let title = "";
  const sections = {};
  let current = null;
  for (const line of md.replace(/^﻿/, "").split(/\r?\n/)) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    const h1 = line.match(/^#\s+(.+)$/);
    if (h2) current = h2[1].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    else if (h1 && !title) title = h1[1].trim();
    else if (current) sections[current] = ((sections[current] || "") + "\n" + line).trim();
  }
  const pick = (names) => names.map((n) => sections[n]).find(Boolean) || "";
  return {
    title,
    summary: pick(["resumen"]),
    highlights: pick(["lo que ha pasado", "destacados", "que ha pasado"]),
    next_steps: pick(["proximos pasos", "siguientes pasos"]),
  };
}

async function main() {
  const a = args();
  if (a.solo_leer) {
    console.log(JSON.stringify(parseReport(fs.readFileSync(String(a.archivo), "utf8")), null, 2));
    return;
  }
  if (!a.cliente || !/^\d{4}-\d{2}$/.test(String(a.mes || ""))) {
    console.log("Uso: npm run data:report -- --cliente <slug> --mes AAAA-MM --archivo <informe.md> [--publicar] [--pdf <url>]");
    process.exit(1);
  }

  const period = `${a.mes}-01`;

  let parsed = null;
  if (!a.despublicar) {
    if (!a.archivo) {
      c.err("Falta --archivo.");
      process.exit(1);
    }
    parsed = parseReport(fs.readFileSync(String(a.archivo), "utf8"));
    if (!parsed.summary && !parsed.highlights && !parsed.next_steps) {
      c.err("No encuentro secciones «## Resumen», «## Lo que ha pasado» o «## Próximos pasos» en el archivo.");
      process.exit(1);
    }
  }
  const pdf = a.pdf ? String(a.pdf) : undefined;
  if (pdf && !pdf.startsWith("https://")) {
    c.err("--pdf debe ser una URL https://");
    process.exit(1);
  }

  const sb = admin(loadEnv());
  const client = await clientBySlug(sb, String(a.cliente));

  if (a.despublicar) {
    const { error } = await sb.from("reports").update({ published: false }).eq("client_id", client.id).eq("period", period);
    if (error) throw error;
    c.ok(`Informe ${a.mes} de ${client.name} retirado del área.`);
    return;
  }

  const row = { client_id: client.id, period, ...parsed, published: Boolean(a.publicar), ...(pdf ? { pdf_url: pdf } : {}) };
  const { error } = await sb.from("reports").upsert(row, { onConflict: "client_id,period" });
  if (error) throw error;
  c.ok(`Informe ${a.mes} de ${client.name} guardado${a.publicar ? " y publicado" : " como borrador (añade --publicar para que lo vea)"}.`);
}

await main();
