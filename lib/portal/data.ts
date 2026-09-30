/**
 * Acceso a datos del área de clientes utilizando Firebase Firestore y Firebase Auth.
 */
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getFirebaseUser, portalMode } from "../firebase/auth";
import { getDb } from "../firebase/admin";
import type { DailyMetric, Incident, IncidentMessage, Member, PortalBooking, Report, Session } from "./types";

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
  let q = db
    .collection("daily_metrics")
    .where("client_id", "==", clientId)
    .where("date", ">=", fromIso)
    .orderBy("date");

  if (toIso) {
    q = q.where("date", "<=", toIso);
  }

  const snap = await q.get();

  return snap.docs.map((d) => {
    const r = d.data();
    return {
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
    };
  });
}

// ── Informes ────────────────────────────────────

export async function getReports(clientId: string): Promise<Report[]> {
  const db = getDb();
  const snap = await db
    .collection("reports")
    .where("client_id", "==", clientId)
    .where("published", "==", true)
    .orderBy("period", "desc")
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      period: data.period,
      title: data.title || "",
      summary: data.summary || "",
      highlights: data.highlights || "",
      next_steps: data.next_steps || "",
      pdf_url: data.pdf_url || "",
    };
  });
}

export async function getReport(clientId: string, period: string): Promise<Report | null> {
  const db = getDb();
  const snap = await db
    .collection("reports")
    .where("client_id", "==", clientId)
    .where("period", "==", period)
    .where("published", "==", true)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();

  return {
    id: d.id,
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
    .orderBy("starts_at", "desc")
    .limit(50)
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      notes: data.notes || "",
      status: data.status,
      name: data.name,
    };
  });
}

// ── Incidencias ─────────────────────────────────

export async function getIncidents(clientId: string): Promise<Incident[]> {
  const db = getDb();
  const snap = await db
    .collection("incidents")
    .where("client_id", "==", clientId)
    .orderBy("updated_at", "desc")
    .limit(200)
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title,
      description: data.description || "",
      category: data.category,
      priority: data.priority,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  });
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
