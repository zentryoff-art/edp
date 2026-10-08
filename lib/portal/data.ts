/**
 * Acceso a datos del área de clientes utilizando Firebase Firestore y Firebase Auth.
 */
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getFirebaseUser, portalMode } from "../firebase/auth";
import { getDb } from "../firebase/admin";
import type { Client, DailyMetric, Incident, IncidentMessage, Lead, Member, PortalBooking, Report, Session } from "./types";
import { normalizeLeadDoc } from "./qualification";

const num = (v: unknown) => (v == null ? 0 : Number(v));

export const getSession = cache(async (): Promise<Session | null> => {
  if (portalMode === "missing") return null;

  const user = await getFirebaseUser();
  if (!user) return null;

  const db = getDb();

  // Buscar todas las membresías del usuario en client_members
  const memberSnap = await db
    .collection("client_members")
    .where("user_id", "==", user.uid)
    .get();

  if (memberSnap.empty) {
    return { userId: user.uid, email: user.email || "", member: null };
  }

  // Cargar todos los clientes asociados válidos
  const clientIds = Array.from(new Set(memberSnap.docs.map((d) => d.data().client_id).filter(Boolean)));
  if (clientIds.length === 0) {
    return { userId: user.uid, email: user.email || "", member: null };
  }

  const clientsSnap = await Promise.all(
    clientIds.map((cid) => db.collection("clients").doc(cid as string).get())
  );

  const availableClients: Client[] = clientsSnap
    .filter((snap) => snap.exists)
    .map((snap) => {
      const data = snap.data()!;
      return {
        id: snap.id,
        name: data.name || snap.id,
        slug: data.slug || snap.id,
        sector: data.sector || "",
        features: data.features || {
          has_elevator: snap.id === "palma" || snap.id === "laterra",
          accepts_national: snap.id !== "shalom",
        },
      };
    });

  if (availableClients.length === 0) {
    return { userId: user.uid, email: user.email || "", member: null };
  }

  // Determinar cliente activo:
  // 1. Por cookie portal_client_id si coincide con alguno de sus clientes
  // 2. Por defecto el primero
  let activeClient = availableClients[0];
  try {
    const cookieStore = await cookies();
    const cookieClientId = cookieStore.get("portal_client_id")?.value;
    if (cookieClientId) {
      const found = availableClients.find((c) => c.id === cookieClientId || c.slug === cookieClientId);
      if (found) activeClient = found;
    }
  } catch {}

  const activeMemberDoc = memberSnap.docs.find((d) => d.data().client_id === activeClient.id) || memberSnap.docs[0];
  const memberData = activeMemberDoc.data();

  const member: Member = {
    userId: user.uid,
    email: user.email || "",
    fullName: memberData.full_name || "",
    role: memberData.role || "member",
    client: activeClient,
    availableClients,
  };

  return { userId: user.uid, email: user.email || "", member };
});

/** Para páginas del área: exige sesión y cliente asociado. */
export async function requireMember(): Promise<Member> {
  const s = await getSession();
  if (!s) redirect("/clientes/login");
  if (!s.member) redirect("/clientes/sin-acceso");
  return s.member;
}

// ── Métricas ────────────────────────────────────

export async function getMetrics(clientId: string, fromIso: string, toIso?: string): Promise<DailyMetric[]> {
  const db = getDb();
  
  // 1. Consultar subcolección del cliente donde el VPS sincroniza
  let snap = await db
    .collection("clients")
    .doc(clientId)
    .collection("daily_metrics")
    .get();

  // 2. Si estuviera vacía, fallback de compatibilidad con colección raíz
  if (snap.empty) {
    snap = await db
      .collection("daily_metrics")
      .where("client_id", "==", clientId)
      .get();
  }

  const metrics = snap.docs
    .map((d) => d.data())
    .filter((r) => r.date >= fromIso && (!toIso || r.date <= toIso))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  return metrics.map((r) => ({
    date: r.date,
    channel: r.channel || "google_lsa",
    client_id: r.client_id || clientId,
    spend: num(r.spend),
    cost_micros: r.cost_micros != null ? Number(r.cost_micros) : undefined,
    impressions: r.impressions != null ? Number(r.impressions) : 0,
    top_impression_percentage: r.top_impression_percentage != null ? Number(r.top_impression_percentage) : null,
    absolute_top_impression_percentage: r.absolute_top_impression_percentage != null ? Number(r.absolute_top_impression_percentage) : null,
    customer_id: r.customer_id,
    campaign_id: r.campaign_id,
    currency: r.currency || "EUR",
    account_timezone: r.account_timezone,
    synced_at: r.synced_at,
    leads_1: num(r.leads_1),
    leads_2: num(r.leads_2),
    leads_3: num(r.leads_3),
    leads_4: num(r.leads_4),
    leads_5: num(r.leads_5),
    closed: num(r.closed),
    revenue: num(r.revenue),
    // Meta Ads
    clicks: r.clicks != null ? Number(r.clicks) : undefined,
    inline_link_clicks: r.inline_link_clicks != null ? Number(r.inline_link_clicks) : undefined,
    actions: Array.isArray(r.actions) ? r.actions : undefined,
    action_values: r.action_values ?? undefined,
    account_id: r.account_id,
    account_name: r.account_name,
    campaign_name: r.campaign_name,
    adset_id: r.adset_id,
    adset_name: r.adset_name,
    ad_id: r.ad_id,
    ad_name: r.ad_name,
    source: r.source,
    reporting_level: r.reporting_level,
  }));
}

// ── Informes ────────────────────────────────────

export async function getReports(clientId: string): Promise<Report[]> {
  const db = getDb();
  const snap = await db
    .collection("reports")
    .where("client_id", "==", clientId)
    .get();

  const reports = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((data: any) => data.published === true)
    .sort((a: any, b: any) => (b.period || "").localeCompare(a.period || ""));

  return reports.map((data: any) => ({
    id: data.id,
    period: data.period,
    title: data.title || "",
    summary: data.summary || "",
    highlights: data.highlights || "",
    next_steps: data.next_steps || "",
    pdf_url: data.pdf_url || "",
  }));
}

export async function getReport(clientId: string, period: string): Promise<Report | null> {
  const db = getDb();
  const snap = await db
    .collection("reports")
    .where("client_id", "==", clientId)
    .get();

  const doc = snap.docs.find((d) => {
    const data = d.data();
    return data.period === period && data.published === true;
  });

  if (!doc) return null;
  const data = doc.data();

  return {
    id: doc.id,
    period: data.period,
    title: data.title || "",
    summary: data.summary || "",
    highlights: data.highlights || "",
    next_steps: data.next_steps || "",
    pdf_url: data.pdf_url || "",
  };
}

// ── Llamadas ────────────────────────────────────

export async function getBookings(clientId: string): Promise<PortalBooking[]> {
  const db = getDb();
  const snap = await db
    .collection("bookings")
    .where("client_id", "==", clientId)
    .get();

  const list = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as any))
    .sort((a, b) => (b.starts_at || "").localeCompare(a.starts_at || ""))
    .slice(0, 50);

  return list.map((data) => ({
    id: data.id,
    starts_at: data.starts_at,
    ends_at: data.ends_at,
    notes: data.notes || "",
    status: data.status,
    name: data.name,
  }));
}

// ── Incidencias ─────────────────────────────────

export async function getIncidents(clientId: string): Promise<Incident[]> {
  const db = getDb();
  const snap = await db
    .collection("incidents")
    .where("client_id", "==", clientId)
    .get();

  const list = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as any))
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))
    .slice(0, 200);

  return list.map((data) => ({
    id: data.id,
    title: data.title,
    description: data.description || "",
    category: data.category,
    priority: data.priority,
    status: data.status,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }));
}

export async function getIncident(clientId: string, id: string): Promise<{ incident: Incident; messages: IncidentMessage[] } | null> {
  const db = getDb();
  const doc = await db.collection("incidents").doc(id).get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.client_id !== clientId) return null;

  const incident: Incident = {
    id: doc.id,
    title: data.title,
    description: data.description || "",
    category: data.category,
    priority: data.priority,
    status: data.status,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };

  const messagesSnap = await db
    .collection("incident_messages")
    .where("incident_id", "==", id)
    .orderBy("created_at", "asc")
    .get();

  const messages: IncidentMessage[] = messagesSnap.docs.map((m) => {
    const md = m.data();
    return {
      id: m.id,
      author_name: md.author_name || "",
      is_team: Boolean(md.is_team),
      body: md.body,
      created_at: md.created_at,
    };
  });

  return { incident, messages };
}

// ── Leads ───────────────────────────────────────

export async function getLeads(clientId: string, fromDate: string = ""): Promise<Lead[]> {
  const db = getDb();
  const clientRef = db.collection("clients").doc(clientId);

  // 1. Sub-colecciones por canal: leads_lsa y leads_meta
  const [lsaSnap, metaSnap] = await Promise.all([
    clientRef.collection("leads_lsa").get(),
    clientRef.collection("leads_meta").get(),
  ]);

  let allDocs: Record<string, any>[] = [
    ...lsaSnap.docs.map((d) => ({ ...d.data(), id: d.id, channel: d.data().channel || "google_lsa" })),
    ...metaSnap.docs.map((d) => ({ ...d.data(), id: d.id, channel: d.data().channel || "meta_ads" })),
  ];

  // 2. Fallback de compatibilidad si aún existen documentos en subcolección leads genérico
  if (allDocs.length === 0) {
    const genericSnap = await clientRef.collection("leads").get();
    if (!genericSnap.empty) {
      allDocs = genericSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
    }
  }

  const list = allDocs
    .filter((d) => d.id !== "_init")
    .map((d) => normalizeLeadDoc(d.id, d))
    .filter((l) => !fromDate || (l.created_at || "") >= fromDate);

  return list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}

