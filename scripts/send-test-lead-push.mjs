import { getFirebaseAdmin, loadEnv } from "./lib/common.mjs";
import webpush from "web-push";

const env = loadEnv();
const { db } = getFirebaseAdmin(env);

const subject = env.VAPID_SUBJECT || "mailto:j.roldan@estudiodigitalpro.com";
const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(subject, publicKey, privateKey);

console.log("Consultando suscripciones de jg...");
const snap = await db.collection("clients").doc("jg").collection("push_subscriptions").where("active", "==", true).get();

console.log(`Encontradas ${snap.size} suscripción(es) activa(s) en jg.`);

const payload = JSON.stringify({
  title: "🔥 Nuevo lead: Prueba en vivo de Hermes",
  body: "Mudanza piso 3 habitaciones en Zaragoza · Google LSA",
  url: "/clientes/leads",
  leadId: "TEST-LEAD-REAL",
  tag: "lead-test-" + Date.now(),
});

for (const doc of snap.docs) {
  const d = doc.data();
  console.log(`Enviando notificación a doc ${doc.id}...`);
  try {
    const res = await webpush.sendNotification(
      {
        endpoint: d.endpoint,
        keys: {
          p256dh: d.keys.p256dh,
          auth: d.keys.auth,
        },
      },
      payload
    );
    console.log(`✅ ¡Entregada con éxito! Código HTTP: ${res.statusCode}`);
  } catch (err) {
    console.error(`❌ Error entregando a ${doc.id}:`, err);
  }
}

process.exit(0);
