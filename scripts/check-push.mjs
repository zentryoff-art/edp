import { getFirebaseAdmin, loadEnv } from "./lib/common.mjs";

const env = loadEnv();
const { db } = getFirebaseAdmin(env);

const clients = ["duala", "henry", "jg", "laterra", "palma", "shalom"];

console.log("=== COMPROBACIÓN DE SUSCRIPCIONES PUSH ===");
for (const cid of clients) {
  const snap = await db.collection("clients").doc(cid).collection("push_subscriptions").get();
  console.log(`Cliente [${cid}]: ${snap.size} suscripción(es)`);
  for (const doc of snap.docs) {
    const d = doc.data();
    console.log(`  - Sub ID: ${doc.id}`);
    console.log(`    Active: ${d.active}`);
    console.log(`    MemberId: ${d.memberId}`);
    console.log(`    UserAgent: ${d.userAgent?.slice(0, 50)}...`);
    console.log(`    UpdatedAt: ${d.updatedAt}`);
  }
}

console.log("\n=== COMPROBACIÓN DE ÚLTIMOS LEADS EN FIRESTORE ===");
for (const cid of clients) {
  for (const col of ["leads_lsa", "leads_meta"]) {
    const snap = await db
      .collection("clients")
      .doc(cid)
      .collection(col)
      .orderBy("created_at", "desc")
      .limit(2)
      .get();
    if (!snap.empty) {
      console.log(`[${cid}/${col}]: ${snap.size} últimos leads`);
      for (const doc of snap.docs) {
        const d = doc.data();
        console.log(`  - Lead ID: ${doc.id} | Creado: ${d.created_at || d.date || d.timestamp} | Canal: ${d.channel} | Status: ${d.status}`);
      }
    }
  }
}

process.exit(0);
