/**
 * Acceso a datos del área de clientes utilizando Firebase Firestore y Firebase Auth.
 */
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getFirebaseUser, portalMode } from "../firebase/auth";
import { getDb } from "../firebase/admin";
import type { DailyMetric, Incident, IncidentMessage, Lead, Member, PortalBooking, Report, Session } from "./types";
import { normalizeLeadDoc } from "./qualification";

const num = (v: unknown) => (v == null ? 0 : Number(v));

export const getSession = cache(async (): Promise<Session | null> => {
  if (portalMode === "missing") return null;

  const user = await getFirebaseUser();
  if (!user) return null;

  const db = getDb();

  // Buscar membrecía en client_members
  const memberSnap = await db
    .collection("client_members")
    .where("user_id", "==", user.uid)
    .limit(1)
    .get();

  if (memberSnap.empty) {
    return { userId: user.uid, email: user.email || "", member: null };
  }

  const memberData = memberSnap.docs[0].data();
  const clientSnap = await db.collection("clients").doc(memberData.client_id).get();
  const clientData = clientSnap.data();

  const member: Member | null = clientData
    ? {
        userId: user.uid,
        email: user.email || "",
        fullName: memberData.full_name || "",
        role: memberData.role || "member",
        client: {
          id: clientSnap.id,
          name: clientData.name || "",
          slug: clientData.slug || "",
          sector: clientData.sector || "",
        },
      }
    : null;

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
  const snap = await db
    .collection("daily_metrics")
    .where("client_id", "==", clientId)
    .get();

  const metrics = snap.docs
    .map((d) => d.data())
    .filter((r) => r.date >= fromIso && (!toIso || r.date <= toIso))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  return metrics.map((r) => ({
    date: r.date,
    channel: r.channel,
    spend: num(r.spend),
    leads_1: num(r.leads_1),
    leads_2: num(r.leads_2),
    leads_3: num(r.leads_3),
    leads_4: num(r.leads_4),
    leads_5: num(r.leads_5),
    closed: num(r.closed),
    revenue: num(r.revenue),
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

export async function getLeads(clientId: string): Promise<Lead[]> {
  const db = getDb();
  
  // 1. Sub-colección dedicada: /clients/{client_id}/leads/{lead_id}
  let snap = await db
    .collection("clients")
    .doc(clientId)
    .collection("leads")
    .get();

  // 2. Fallback de compatibilidad si aún existen documentos en la colección raíz /leads
  if (snap.empty) {
    const rootSnap = await db
      .collection("leads")
      .where("client_id", "==", clientId)
      .get();
    if (!rootSnap.empty) {
      snap = rootSnap;
    }
  }

  const list = snap.docs.map((d) => normalizeLeadDoc(d.id, d.data()));
  return list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}

