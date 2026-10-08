import { getFirebaseAdmin, loadEnv, c } from "./lib/common.mjs";

const env = loadEnv();
const { db } = getFirebaseAdmin(env);

const USER_ID = "7zO9cHbRBZhZjyprVboTb5DXrhA2";
const USER_NAME = "Facundo Fros";

const clientsToAdd = [
  {
    id: "duala",
    name: "Mudanzas Duala",
    slug: "duala",
    sector: "Mudanzas y Guardamuebles",
    features: { has_elevator: false, accepts_national: true },
  },
  {
    id: "henry",
    name: "Mudanzas Henry",
    slug: "henry",
    sector: "Mudanzas y Guardamuebles",
    features: { has_elevator: false, accepts_national: true },
  },
  {
    id: "laterra",
    name: "Mudanzas La Terra",
    slug: "laterra",
    sector: "Mudanzas y Guardamuebles",
    features: { has_elevator: true, accepts_national: true },
  },
];

async function main() {
  c.step("1 · Creando / verificando documentos de cliente en Firestore...");

  for (const item of clientsToAdd) {
    const docRef = db.collection("clients").doc(item.id);
    const existing = await docRef.get();

    if (!existing.exists) {
      await docRef.set({
        name: item.name,
        slug: item.slug,
        sector: item.sector,
        created_at: new Date().toISOString(),
      });
      c.ok(`Cliente '${item.name}' (${item.id}) creado con éxito.`);
    } else {
      c.ok(`Cliente '${item.name}' (${item.id}) ya existía.`);
    }

    // Registrar membresía para el usuario gestor
    const memberDocId = `${USER_ID}_${item.id}`;
    const memberRef = db.collection("client_members").doc(memberDocId);
    await memberRef.set(
      {
        user_id: USER_ID,
        client_id: item.id,
        full_name: USER_NAME,
        role: "owner",
        created_at: new Date().toISOString(),
      },
      { merge: true }
    );
    c.ok(`Membresía asignada a ${USER_NAME} para '${item.name}' (${memberDocId}).`);
  }

  c.step("2 · Verificando clientes disponibles...");
  const clientsSnap = await db.collection("clients").get();
  console.log("Total clientes en Firestore:", clientsSnap.size);
  clientsSnap.forEach((d) => console.log(` - ${d.id}:`, d.data().name || d.id));

  c.step("3 · Verificando membresías del usuario...");
  const membersSnap = await db.collection("client_members").where("user_id", "==", USER_ID).get();
  console.log("Membresías de", USER_NAME, ":");
  membersSnap.forEach((d) => console.log(` - client_id: ${d.data().client_id} (doc: ${d.id})`));
}

main().catch(console.error);
