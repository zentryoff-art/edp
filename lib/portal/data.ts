/**
 * Acceso a datos del área de clientes. Todas las lecturas van con la sesión del
 * usuario (RLS en Supabase), así que aunque aquí se filtre por cliente, la base
 * de datos es quien garantiza que nadie ve datos de otro.
 */
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { portalMode, supabaseServer } from "./supabase";
import type { DailyMetric, Incident, IncidentMessage, Member, PortalBooking, Report, Session } from "./types";

const num = (v: unknown) => (v == null ? 0 : Number(v));

export const getSession = cache(async (): Promise<Session | null> => {
  if (portalMode === "missing") return null;

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data } = await sb
    .from("client_members")
    .select("full_name, role, clients (id, name, slug, sector)")
    .eq("user_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  const c = data?.clients as unknown as Member["client"] | null;
  const member: Member | null =
    data && c
      ? { userId: user.id, email: user.email || "", fullName: data.full_name || "", role: data.role, client: c }
      : null;
  return { userId: user.id, email: user.email || "", member };
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
  const sb = await supabaseServer();
  let q = sb
    .from("daily_metrics")
    .select("date, channel, spend, leads_1, leads_2, leads_3, leads_4, leads_5, closed, revenue")
    .eq("client_id", clientId)
    .gte("date", fromIso)
    .order("date");
  if (toIso) q = q.lte("date", toIso);
  const { data, error } = await q.limit(10000);
  if (error) throw error;
  return (data || []).map((r) => ({
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
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("reports")
    .select("id, period, title, summary, highlights, next_steps, pdf_url")
    .eq("client_id", clientId)
    .order("period", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getReport(clientId: string, period: string): Promise<Report | null> {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("reports")
    .select("id, period, title, summary, highlights, next_steps, pdf_url")
    .eq("client_id", clientId)
    .eq("period", period)
    .maybeSingle();
  return data;
}

// ── Llamadas ────────────────────────────────────

export async function getBookings(clientId: string): Promise<PortalBooking[]> {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("bookings")
    .select("id, starts_at, ends_at, notes, status, name")
    .eq("client_id", clientId)
    .order("starts_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

// ── Incidencias ─────────────────────────────────

export async function getIncidents(clientId: string): Promise<Incident[]> {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("incidents")
    .select("id, title, description, category, priority, status, created_at, updated_at")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data || [];
}

export async function getIncident(clientId: string, id: string): Promise<{ incident: Incident; messages: IncidentMessage[] } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const sb = await supabaseServer();
  const { data: incident } = await sb
    .from("incidents")
    .select("id, title, description, category, priority, status, created_at, updated_at")
    .eq("client_id", clientId)
    .eq("id", id)
    .maybeSingle();
  if (!incident) return null;
  const { data: messages } = await sb
    .from("incident_messages")
    .select("id, author_name, is_team, body, created_at")
    .eq("incident_id", id)
    .order("created_at");
  return { incident, messages: messages || [] };
}

