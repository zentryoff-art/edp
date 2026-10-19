import { getFirebaseAdmin, loadEnv } from "./lib/common.mjs";

const env = loadEnv();
const { db } = getFirebaseAdmin(env);

const allClients = ["duala", "henry", "jg", "laterra", "palma", "shalom"];

// 1. Obtener la suscripción activa de tu móvil en jg
const sourceSnap = await db.collection("clients").doc("jg").collection("push_subscriptions").where("active", "==", true).get();

if (sourceSnap.empty) {
  console.log("No se encontró suscripción activa en jg.");
  process.exit(1);
}

const subDoc = sourceSnap.docs[0];
const subData = subDoc.data();
console.log(`Copiando suscripción [${subDoc.id}] a todas las empresas...`);

for (const cid of allClients) {
  if (cid === "jg") continue;
  await db.collection("clients").doc(cid).collection("push_subscriptions").doc(subDoc.id).set(subData, { merge: true });
  console.log(`✅ Sincronizado en [${cid}]`);
}

console.log("¡Listo! Tu móvil ahora está registrado en todas las empresas para recibir leads.");
process.exit(0);
