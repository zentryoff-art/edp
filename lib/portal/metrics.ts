import type { DailyMetric } from "./types";

export type Totals = {
  spend: number;
  impressions: number;
  avgTopImpressionShare: number | null;
  avgAbsTopImpressionShare: number | null;
  byScore: [number, number, number, number, number]; // nota 1..5
  leads: number;
  hot: number; // nota 4–5
  closed: number;
  revenue: number;
  cpl: number | null;
  cplHot: number | null;
  closeRate: number | null; // cerrados / leads 4–5
  roas: number | null;
};

export function totals(
  rows: DailyMetric[],
  overrideLeads?: number,
  overrideClosed?: number,
  overrideRevenue?: number
): Totals {
  const byScore: Totals["byScore"] = [0, 0, 0, 0, 0];
  let spend = 0,
    closed = 0,
    revenue = 0,
    impressions = 0;

  let topImpSum = 0;
  let topImpCount = 0;
  let absTopImpSum = 0;
  let absTopImpCount = 0;

  for (const r of rows) {
    spend += r.spend || 0;
    closed += r.closed || 0;
    revenue += r.revenue || 0;
    impressions += r.impressions || 0;

    if (r.top_impression_percentage != null) {
      topImpSum += r.top_impression_percentage;
      topImpCount++;
    }
    if (r.absolute_top_impression_percentage != null) {
      absTopImpSum += r.absolute_top_impression_percentage;
      absTopImpCount++;
    }

    byScore[0] += r.leads_1 || 0;
    byScore[1] += r.leads_2 || 0;
    byScore[2] += r.leads_3 || 0;
    byScore[3] += r.leads_4 || 0;
    byScore[4] += r.leads_5 || 0;
  }

  const scoreLeads = byScore.reduce((a, b) => a + b, 0);
  const leads = overrideLeads !== undefined ? overrideLeads : scoreLeads;
  const finalClosed = overrideClosed !== undefined ? overrideClosed : closed;
  const finalRevenue = overrideRevenue !== undefined ? overrideRevenue : revenue;
  const hot = byScore[3] + byScore[4];

  return {
    spend,
    impressions,
    avgTopImpressionShare: topImpCount > 0 ? topImpSum / topImpCount : null,
    avgAbsTopImpressionShare: absTopImpCount > 0 ? absTopImpSum / absTopImpCount : null,
    byScore,
    leads,
    hot,
    closed: finalClosed,
    revenue: finalRevenue,
    cpl: leads > 0 ? spend / leads : null,
    cplHot: hot > 0 ? spend / hot : null,
    closeRate: hot > 0 ? finalClosed / hot : null,
    roas: spend > 0 ? finalRevenue / spend : null,
  };
}

/** Variación relativa (null si no hay base). */
export const delta = (now: number | null, before: number | null) =>
  now == null || before == null || before === 0 ? null : (now - before) / before;

// ── Fechas ──────────────────────────────────────

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function monthBounds(period: string) {
  const [y, m] = period.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  return { from: isoDay(start), to: isoDay(end), days: end.getUTCDate() };
}

export function monthOffset(period: string, offset: number) {
  const [y, m] = period.split("-").map(Number);
  return isoDay(new Date(Date.UTC(y, m - 1 + offset, 1)));
}

export function currentMonth() {
  const d = new Date();
  return isoDay(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}

export const inRange = (rows: DailyMetric[], from: string, to: string) => rows.filter((r) => r.date >= from && r.date <= to);

// ── Series ──────────────────────────────────────

export type WeekPoint = { start: string; end: string; hot: number; rest: number; spend: number };

/** Semanas (lunes a domingo) que terminan en la semana de `today`. */
export function weekly(rows: DailyMetric[], weeks: number, today = new Date()): WeekPoint[] {
  const t = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const monday = new Date(t.getTime() - ((t.getUTCDay() + 6) % 7) * 86400000);
  const out: WeekPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const s = new Date(monday.getTime() - i * 7 * 86400000);
    const e = new Date(s.getTime() + 6 * 86400000);
    out.push({ start: isoDay(s), end: isoDay(e), hot: 0, rest: 0, spend: 0 });
  }
  const first = out[0].start;
  for (const r of rows) {
    if (r.date < first) continue;
    const w = out.find((p) => r.date >= p.start && r.date <= p.end);
    if (!w) continue;
    w.hot += (r.leads_4 || 0) + (r.leads_5 || 0);
    w.rest += (r.leads_1 || 0) + (r.leads_2 || 0) + (r.leads_3 || 0);
    w.spend += r.spend;
  }
  return out;
}

export type DayPoint = { start: string; end: string; hot: number; rest: number; spend: number };

export function daily(rows: DailyMetric[], from: string, days: number): DayPoint[] {
  const out: DayPoint[] = [];
  const s = new Date(from + "T00:00:00Z");
  for (let i = 0; i < days; i++) {
    const d = isoDay(new Date(s.getTime() + i * 86400000));
    out.push({ start: d, end: d, hot: 0, rest: 0, spend: 0 });
  }
  for (const r of rows) {
    const p = out.find((x) => x.start === r.date);
    if (!p) continue;
    p.hot += (r.leads_4 || 0) + (r.leads_5 || 0);
    p.rest += (r.leads_1 || 0) + (r.leads_2 || 0) + (r.leads_3 || 0);
    p.spend += r.spend;
  }
  return out;
}

export function byChannel(rows: DailyMetric[]) {
  const map = new Map<string, DailyMetric[]>();
  for (const r of rows) map.set(r.channel, [...(map.get(r.channel) || []), r]);
  return [...map.entries()]
    .map(([channel, list]) => ({ channel, ...totals(list) }))
    .sort((a, b) => b.leads - a.leads);
}

// ── Formato ─────────────────────────────────────

const eur0 = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = new Intl.NumberFormat("es-ES");
const pct0 = new Intl.NumberFormat("es-ES", { style: "percent", maximumFractionDigits: 0 });

export const fmt = {
  eur: (v: number | null) => (v == null ? "—" : Math.abs(v) >= 1000 ? eur0.format(v) : eur2.format(v)),
  eur0: (v: number | null) => (v == null ? "—" : eur0.format(v)),
  int: (v: number | null) => (v == null ? "—" : int.format(v)),
  pct: (v: number | null) => (v == null ? "—" : pct0.format(v)),
  month: (period: string) =>
    new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(period + "T00:00:00Z")),
  monthShort: (period: string) =>
    new Intl.DateTimeFormat("es-ES", { month: "long", timeZone: "UTC" }).format(new Date(period + "T00:00:00Z")),
  day: (iso: string) =>
    new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(iso.slice(0, 10) + "T00:00:00Z")),
  dateTime: (iso: string) =>
    new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Madrid",
    }).format(new Date(iso)),
  relative: (iso: string) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    const rtf = new Intl.RelativeTimeFormat("es-ES", { numeric: "auto" });
    if (diff < 3600) return rtf.format(-Math.max(1, Math.round(diff / 60)), "minute");
    if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour");
    if (diff < 86400 * 30) return rtf.format(-Math.round(diff / 86400), "day");
    return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
  },
};

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const CHANNEL_NAMES: Record<string, string> = {
  google: "Google Ads",
  meta: "Meta Ads",
  lsa: "Google LSA",
  google_lsa: "Google LSA",
  meta_ads: "Meta Ads",
  linkedin: "LinkedIn Ads",
  organico: "Orgánico",
  otros: "Otros",
};
export const channelName = (c: string) => CHANNEL_NAMES[c] || cap(c);
