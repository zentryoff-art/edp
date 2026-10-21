import { getFirebaseAdmin, loadEnv, c } from "./lib/common.mjs";

const env = loadEnv();
const { db } = getFirebaseAdmin(env);

const DEMO_CLIENT_IDS = [
  "demo_reformas",
  "demo_fontaneria",
  "demo_electricistas",
  "demo_climatizacion",
  "demo_pintura",
];

const USER_IDS = [
  "7zO9cHbRBZhZjyprVboTb5DXrhA2",
  "Fkr1yam5T6huQEHIL0traVjoGdc2",
];

async function main() {
  c.step("Eliminando clientes y leads de prueba...");

  for (const cid of DEMO_CLIENT_IDS) {
    const clientRef = db.collection("clients").doc(cid);

    // Eliminar subcolecciones leads_lsa, leads_meta, leads_web
    for (const sub of ["leads_lsa", "leads_meta", "leads_web", "leads"]) {
      const snap = await clientRef.collection(sub).get();
      for (const d of snap.docs) {
        await d.ref.delete();
      }
    }

    // Eliminar membresias
    for (const uid of USER_IDS) {
      await db.collection("client_members").doc(`${uid}_${cid}`).delete().catch(() => {});
    }

    // Eliminar cliente
    await clientRef.delete();
    c.ok(`Cliente demo eliminado: ${cid}`);
  }

  c.step("Limpieza de clientes demo completada.");
}

main().catch(console.error);
