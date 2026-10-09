#!/usr/bin/env node
/**
 * Script para ver o actualizar los datos legales de la web en Firestore (colección 'config', doc 'legal').
 *
 * Ejemplos de uso:
 *   node scripts/update-legal-config.mjs
 *   node scripts/update-legal-config.mjs --tax_id "B12345678" --holder_name "Estudio Digital Pro S.L."
 *   node scripts/update-legal-config.mjs --address "Calle Ejemplo 1, Madrid"
 */
import { getFirebaseAdmin, loadEnv, args, c } from "./lib/common.mjs";

const env = loadEnv();
const { db } = getFirebaseAdmin(env);
const params = args();

const docRef = db.collection("config").doc("legal");

async function run() {
  const snap = await docRef.get();
  const current = snap.exists ? snap.data() : {};

  // Campos actualizables
  const fields = ["holder_name", "trade_name", "tax_id", "address", "email", "phone", "phone_display", "registry_details"];
  const updates = {};
  let hasUpdates = false;

  for (const f of fields) {
    if (params[f] !== undefined) {
      updates[f] = String(params[f]).trim();
      hasUpdates = true;
    }
  }

  if (hasUpdates) {
    updates.updated_at = new Date().toISOString();
    await docRef.set(updates, { merge: true });
    c.ok("Datos legales actualizados correctamente en Firestore:");
    const updatedSnap = await docRef.get();
    console.log(JSON.stringify(updatedSnap.data(), null, 2));
  } else {
    c.step("Estado actual de 'config/legal' en Firestore:");
    console.log(JSON.stringify(current, null, 2));
    console.log("\nPara actualizar un campo desde consola:");
    console.log('  node scripts/update-legal-config.mjs --tax_id "B12345678" --holder_name "Tu Empresa S.L."');
  }

  process.exit(0);
}

run().catch((err) => {
  c.err(`Error: ${err.message}`);
  process.exit(1);
});
