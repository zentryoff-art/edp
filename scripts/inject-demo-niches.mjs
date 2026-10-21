import { getFirebaseAdmin, loadEnv, c } from "./lib/common.mjs";

const env = loadEnv();
const { db } = getFirebaseAdmin(env);

// Usuarios gestores autorizados
const USERS = [
  { id: "7zO9cHbRBZhZjyprVboTb5DXrhA2", name: "Facundo Fros" },
  { id: "Fkr1yam5T6huQEHIL0traVjoGdc2", name: "Zentry Admin" },
];

const DEMO_NICHES = [
  {
    id: "demo_reformas",
    name: "📐 Reformas Pro (Demo)",
    slug: "demo_reformas",
    sector: "Reformas Integrales",
    industry: "reformas",
    features: {
      has_elevator: true,
      accepts_national: true,
      requires_special_equipment: true,
      is_large_scale: true,
    },
    lead: {
      id: "LEAD-REF-001",
      contact_name: "Carlos Méndez",
      phone: "+34 612 345 678",
      channel: "google_lsa",
      lead_type: "message",
      message: "Hola, queremos hacer una reforma integral de un piso de 95m2 en Barcelona. Cambiar cocina, dos baños y tirar el tabique del salón.",
      location: { display_name: "Barcelona" },
      status: "activo",
      created_at: new Date().toISOString(),
    },
  },
  {
    id: "demo_fontaneria",
    name: "🚰 Fontanería & Desatascos (Demo)",
    slug: "demo_fontaneria",
    sector: "Fontanería y Desatascos",
    industry: "fontaneria",
    features: {
      has_elevator: true,
      accepts_national: true,
      requires_special_equipment: true,
      is_large_scale: true,
    },
    lead: {
      id: "LEAD-FONT-001",
      contact_name: "Marta Gómez",
      phone: "+34 623 456 789",
      channel: "google_lsa",
      lead_type: "phone_call",
      message: "Tenemos un atasco importante en la bajante comunitaria del edificio y sale agua por el bajo. Necesitamos camión cuba urgente.",
      location: { display_name: "Madrid" },
      status: "activo",
      created_at: new Date().toISOString(),
    },
  },
  {
    id: "demo_electricistas",
    name: "⚡ Electricistas Rápidos (Demo)",
    slug: "demo_electricistas",
    sector: "Electricistas e Instalaciones",
    industry: "electricistas",
    features: {
      has_elevator: true,
      accepts_national: true,
      requires_special_equipment: true,
      is_large_scale: true,
    },
    lead: {
      id: "LEAD-ELEC-001",
      contact_name: "Javier Navarro",
      phone: "+34 634 567 890",
      channel: "google_lsa",
      lead_type: "message",
      message: "Necesito cambiar el cuadro eléctrico antiguo por uno nuevo con protección contra sobretensiones y solicitar boletín para aumento de potencia.",
      location: { display_name: "Valencia" },
      status: "activo",
      created_at: new Date().toISOString(),
    },
  },
  {
    id: "demo_climatizacion",
    name: "❄️ Clima & Aerotermia (Demo)",
    slug: "demo_climatizacion",
    sector: "Climatización y Calefacción",
    industry: "climatizacion",
    features: {
      has_elevator: true,
      accepts_national: true,
      requires_special_equipment: true,
      is_large_scale: true,
    },
    lead: {
      id: "LEAD-CLIMA-001",
      contact_name: "Laura Martínez",
      phone: "+34 645 678 901",
      channel: "google_lsa",
      lead_type: "message",
      message: "Quiero presupuesto para sustituir caldera de gasoil por un sistema completo de aerotermia con suelo radiante para vivienda unifamiliar.",
      location: { display_name: "Sevilla" },
      status: "activo",
      created_at: new Date().toISOString(),
    },
  },
  {
    id: "demo_pintura",
    name: "🎨 Pinturas & Fachadas (Demo)",
    slug: "demo_pintura",
    sector: "Pintura y Fachadas",
    industry: "pintura",
    features: {
      has_elevator: true,
      accepts_national: true,
      requires_special_equipment: true,
      is_large_scale: true,
    },
    lead: {
      id: "LEAD-PINT-001",
      contact_name: "Comunidad C/ Mayor 14",
      phone: "+34 656 789 012",
      channel: "google_lsa",
      lead_type: "message",
      message: "Somos una comunidad de 12 vecinos. Necesitamos pintar el patio de luces, reparar grietas y presupuestar impermeabilización de la cubierta.",
      location: { display_name: "Zaragoza" },
      status: "activo",
      created_at: new Date().toISOString(),
    },
  },
];

async function main() {
  c.step("Inyectando clientes y leads de prueba para cada nuevo nicho...");

  for (const item of DEMO_NICHES) {
    // 1. Crear documento de cliente
    const clientRef = db.collection("clients").doc(item.id);
    await clientRef.set({
      name: item.name,
      slug: item.slug,
      sector: item.sector,
      industry: item.industry,
      features: item.features,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { merge: true });
    c.ok(`Cliente demo creado: ${item.name} (${item.id}) [Nicho: ${item.industry}]`);

    // 2. Asignar membresía a los usuarios gestores para que puedan seleccionarlo en ClientSwitcher
    for (const u of USERS) {
      const memberId = `${u.id}_${item.id}`;
      await db.collection("client_members").doc(memberId).set({
        user_id: u.id,
        client_id: item.id,
        full_name: u.name,
        role: "owner",
        created_at: new Date().toISOString(),
      }, { merge: true });
    }
    c.ok(`Membresías asignadas para ${item.id}`);

    // 3. Inyectar un lead de prueba en leads_lsa
    const leadRef = clientRef.collection("leads_lsa").doc(item.lead.id);
    await leadRef.set({
      ...item.lead,
      client_id: item.id,
      updated_at: new Date().toISOString(),
    }, { merge: true });
    c.ok(`Lead inyectado: ${item.lead.id} para ${item.id}`);
  }

  c.step("¡Listo! Clientes y leads inyectados con éxito.");
  console.log("\nPuedes seleccionarlos desde el selector de empresas en el portal (arriba a la izquierda):");
  DEMO_NICHES.forEach(n => console.log(` - ${n.name} [industry: ${n.industry}]`));
}

main().catch(console.error);
