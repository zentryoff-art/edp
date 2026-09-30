#!/usr/bin/env node
/**
 * Crea o actualiza el informe mensual de un cliente en Firestore.
 *
 *   npm run data:report -- --cliente clinica-sol --mes 2026-09 --archivo informes/sol-2026-09.md [--publicar] [--pdf https://…]
 *   npm run data:report -- --cliente clinica-sol --mes 2026-09 --despublicar
 */
import fs from "node:fs";
import { getFirebaseAdmin, args, c, clientBySlug, loadEnv } from "./lib/common.mjs";

export function parseReport(md) {
  let title = "";
  const sections = {};
  let current = null;
  for (const line of md.replace(/^\uFEFF/, "").split(/\r?\n/)) {
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
  const env = loadEnv();
  const { db } = getFirebaseAdmin(env);
  const client = await clientBySlug(db, String(a.cliente));

  const docId = `${client.id}_${period}`;
  const reportRef = db.collection("reports").doc(docId);

  if (a.despublicar) {
    await reportRef.set({ published: false }, { merge: true });
    c.ok(`Informe de ${a.mes} despublicado para ${client.name}.`);
    return;
  }

  if (!a.archivo) {
    c.err("Falta --archivo.");
    process.exit(1);
  }

  const md = fs.readFileSync(String(a.archivo), "utf8");
  const parsed = parseReport(md);

  const payload = {
    client_id: client.id,
    period,
    title: parsed.title,
    summary: parsed.summary,
    highlights: parsed.highlights,
    next_steps: parsed.next_steps,
    pdf_url: String(a.pdf || ""),
    published: Boolean(a.publicar),
    created_at: new Date().toISOString(),
  };

  await reportRef.set(payload, { merge: true });
  c.ok(`Informe de ${a.mes} guardado para ${client.name} (publicado: ${payload.published ? "sí" : "no"}).`);
}

main();
