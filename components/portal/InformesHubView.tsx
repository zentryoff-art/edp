"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { DailyMetric, Lead, Report } from "@/lib/portal/types";
import { fmt, cap, channelName, isoDay } from "@/lib/portal/metrics";
import { Card, Empty, PageHead, LocationRankingBars, RatioBar } from "@/components/portal/ui";
import { ActivityPeakChart } from "@/components/portal/ActivityPeakChart";
import { extractAccountOptions, matchLeadAccount, matchMetricAccount } from "@/lib/portal/accounts";
import { AccountFilterBar } from "@/components/portal/AccountFilterBar";
import { MonthlySheetEmbed } from "@/components/portal/MonthlySheetEmbed";

interface InformesHubViewProps {
  reports: Report[];
  rows: DailyMetric[];
  leads: Lead[];
  clientName: string;
  clientId?: string;
  initialSheetsMap?: Record<
    string,
    {
      spreadsheetId: string;
      spreadsheetUrl: string;
      embedUrl: string;
      period: string;
      createdAt?: string;
      updatedAt?: string;
    }
  >;
}

type TabType = "mensuales" | "semanales" | "fechas";
type ChannelFilter = "all" | "google_lsa" | "meta_ads";

export function InformesHubView({
  reports,
  rows,
  leads,
  clientName,
  initialSheetsMap = {},
}: InformesHubViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("mensuales");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => isoDay(today), [today]);

  // Opciones de cuentas disponibles para el canal activo
  const accountOptions = useMemo(() => {
    return extractAccountOptions(rows, leads, channelFilter);
  }, [rows, leads, channelFilter]);

  // Etiqueta legible de las cuentas filtradas activas
  const activeAccountLabel = useMemo(() => {
    if (!selectedAccounts.length) return "";
    const names = accountOptions.filter((a) => selectedAccounts.includes(a.id)).map((a) => a.shortLabel || a.label);
    return names.length > 0 ? names.join(", ") : "";
  }, [selectedAccounts, accountOptions]);

  // Filtrado reactivo por canal y cuentas publicitarias
  const channelFilteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchChannel = channelFilter === "all" || r.channel === channelFilter;
      const matchAccount = matchMetricAccount(r, selectedAccounts);
      return matchChannel && matchAccount;
    });
  }, [rows, channelFilter, selectedAccounts]);

  const channelFilteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchChannel = channelFilter === "all" || l.channel === channelFilter;
      const matchAccount = matchLeadAccount(l, selectedAccounts);
      return matchChannel && matchAccount;
    });
  }, [leads, channelFilter, selectedAccounts]);

  // ── 1. Periodos Mensuales (Mes en Curso, Mes Anterior, Histórico) ──
  const currentPeriodId = useMemo(() => {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  }, [today]);

  const prevPeriodId = useMemo(() => {
    const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  }, [today]);

  // Descubrir todos los periodos disponibles a partir de Sheets, Informes, Leads y Métricas
  const availablePeriodIds = useMemo(() => {
    const set = new Set<string>();
    set.add(currentPeriodId);
    set.add(prevPeriodId);
    if (initialSheetsMap) {
      Object.keys(initialSheetsMap).forEach((p) => {
        if (/^\d{4}-\d{2}$/.test(p)) set.add(p);
      });
    }
    reports.forEach((r) => {
      const p = (r.period || "").slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(p)) set.add(p);
    });
    leads.forEach((l) => {
      const p = (l.lead_created_at || l.created_at || "").slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(p)) set.add(p);
    });
    rows.forEach((r) => {
      const p = (r.date || "").slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(p)) set.add(p);
    });
    return Array.from(set).sort().reverse();
  }, [currentPeriodId, prevPeriodId, initialSheetsMap, reports, leads, rows]);

  // Periodo activo seleccionado en la pestaña mensual (por defecto el mes en curso)
  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentPeriodId);

  // Metadatos y regla de consolidación del día 5 para cualquier periodo mensual
  const getPeriodMeta = (periodId: string) => {
    const [y, m] = periodId.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const d = new Date(y, m - 1, 1);
    const monthName = d.toLocaleString("es-ES", { month: "long" });
    const capMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const label = `${capMonthName} ${y}`;
    const isCurrent = periodId === currentPeriodId;
    const isPrevious = periodId === prevPeriodId;

    // Regla del día 5 a las 23:59:59 del mes siguiente
    const nextMonthYear = m === 12 ? y + 1 : y;
    const nextMonth = m === 12 ? 1 : m + 1;
    const closingDate = new Date(Date.UTC(nextMonthYear, nextMonth - 1, 5, 23, 59, 59));
    const isClosed = today.getTime() >= closingDate.getTime();
    const nextD = new Date(nextMonthYear, nextMonth - 1, 1);
    const nextMonthName = nextD.toLocaleString("es-ES", { month: "long" });
    const capNextMonthName = nextMonthName.charAt(0).toUpperCase() + nextMonthName.slice(1);

    return {
      id: periodId,
      year: y,
      month: m,
      start,
      end,
      monthName: capMonthName,
      label,
      isCurrent,
      isPrevious,
      isClosed,
      closingDate,
      nextMonthName: capNextMonthName,
      nextMonthYear,
    };
  };

  // Cálculo de KPIs y métricas para un periodo dado
  const computeStatsForPeriod = (periodId: string) => {
    const meta = getPeriodMeta(periodId);
    const pRows = channelFilteredRows.filter((r) => r.date >= meta.start && r.date <= meta.end);
    const pLeads = channelFilteredLeads.filter((l) => {
      const d = (l.lead_created_at || l.created_at || "").slice(0, 10);
      return d >= meta.start && d <= meta.end;
    });

    const spend = pRows.reduce((a, r) => a + (r.spend || 0), 0);
    const impressions = pRows.reduce((a, r) => a + (r.impressions || 0), 0);
    const clicks = pRows.reduce((a, r) => a + (r.clicks || 0), 0);
    const cpc = clicks > 0 && spend > 0 ? spend / clicks : null;
    const ctr = impressions > 0 && clicks > 0 ? (clicks / impressions) * 100 : null;
    const leadsCount = pLeads.length;
    const cpl = leadsCount > 0 ? spend / leadsCount : null;
    const closed = pLeads.filter(
      (l) => l.status === "cerrado" || l.google_lead_status === "BOOKED" || l.qualification?.status === "venta"
    ).length;

    const locMap = new Map<string, number>();
    for (const l of pLeads) {
      const loc = l.location?.display_name;
      if (loc && loc.trim()) {
        locMap.set(loc.trim(), (locMap.get(loc.trim()) || 0) + 1);
      }
    }
    const locations = [...locMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    return {
      meta,
      rows: pRows,
      leads: pLeads,
      spend,
      impressions,
      clicks,
      cpc,
      ctr,
      leadsCount,
      cpl,
      closed,
      locations,
    };
  };

  const currentStats = useMemo(() => computeStatsForPeriod(currentPeriodId), [currentPeriodId, channelFilteredRows, channelFilteredLeads]);
  const prevStats = useMemo(() => computeStatsForPeriod(prevPeriodId), [prevPeriodId, channelFilteredRows, channelFilteredLeads]);
  const activeStats = useMemo(() => computeStatsForPeriod(selectedPeriod), [selectedPeriod, channelFilteredRows, channelFilteredLeads]);

  // Hoja activa del periodo seleccionado
  const activeSheet = initialSheetsMap[selectedPeriod] || null;
  const prevSheet = initialSheetsMap[prevPeriodId] || null;

  // ── 2. Datos Dinámicos para Informes Semanales (Últimas 6 Semanas) ──
  const weeklyPeriods = useMemo(() => {
    const weeks = [];
    const curr = new Date(today);
    const day = curr.getDay();
    const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
    const currentMonday = new Date(curr.setDate(diffToMonday));
    currentMonday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 6; i++) {
      const start = new Date(currentMonday);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      const target = new Date(start.valueOf());
      const dayNr = (start.getDay() + 6) % 7;
      target.setDate(target.getDate() - dayNr + 3);
      const firstThursday = target.valueOf();
      target.setMonth(0, 1);
      if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
      }
      const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);

      const startIso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
      const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
      const startDay = String(start.getDate()).padStart(2, "0");
      const endDay = String(end.getDate()).padStart(2, "0");
      const startMonth = start.toLocaleString("es-ES", { month: "short" });
      const endMonth = end.toLocaleString("es-ES", { month: "short" });
      const year = end.getFullYear();

      weeks.push({
        id: `${year}-W${String(weekNum).padStart(2, "0")}`,
        label: `Semana ${weekNum} (${startDay} ${startMonth} - ${endDay} ${endMonth} ${year})`,
        start: startIso,
        end: endIso,
        isCurrent: i === 0,
      });
    }

    return weeks.map((w) => {
      const wRows = channelFilteredRows.filter((r) => r.date >= w.start && r.date <= w.end);
      const wLeads = channelFilteredLeads.filter((l) => {
        const d = (l.lead_created_at || l.created_at || "").slice(0, 10);
        return d >= w.start && d <= w.end;
      });
      const wSpend = wRows.reduce((a, r) => a + (r.spend || 0), 0);
      const wImpressions = wRows.reduce((a, r) => a + (r.impressions || 0), 0);
      const wClicks = wRows.reduce((a, r) => a + (r.clicks || 0), 0);
      const wCpc = wClicks > 0 && wSpend > 0 ? wSpend / wClicks : null;
      const wCtr = wImpressions > 0 && wClicks > 0 ? (wClicks / wImpressions) * 100 : null;
      const wCount = wLeads.length;
      const wCpl = wCount > 0 ? wSpend / wCount : null;
      const wCalls = wLeads.filter((l) => l.lead_type === "phone_call" || (l.channel === "google_lsa" && !l.message)).length;
      const wMsgs = wLeads.filter((l) => l.lead_type === "message" || Boolean(l.message) || l.channel === "meta_ads").length;

      return {
        ...w,
        spend: wSpend,
        impressions: wImpressions,
        clicks: wClicks,
        cpc: wCpc,
        ctr: wCtr,
        leadsCount: wCount,
        cpl: wCpl,
        calls: wCalls,
        msgs: wMsgs,
        leads: wLeads,
        rows: wRows,
      };
    });
  }, [today, channelFilteredRows, channelFilteredLeads]);

  // ── 3. Datos para "Consultar por Fecha" ──
  const defaultCustomFrom = useMemo(() => {
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`;
  }, [today]);

  const [customFrom, setCustomFrom] = useState(defaultCustomFrom);
  const [customTo, setCustomTo] = useState(todayIso);

  const customRows = useMemo(() => channelFilteredRows.filter((r) => r.date >= customFrom && r.date <= customTo), [channelFilteredRows, customFrom, customTo]);
  const customLeads = useMemo(() => {
    return channelFilteredLeads.filter((l) => {
      const d = (l.lead_created_at || l.created_at || "").slice(0, 10);
      return d >= customFrom && d <= customTo;
    });
  }, [channelFilteredLeads, customFrom, customTo]);

  const customSpend = useMemo(() => customRows.reduce((a, r) => a + (r.spend || 0), 0), [customRows]);
  const customImpressions = useMemo(() => customRows.reduce((a, r) => a + (r.impressions || 0), 0), [customRows]);
  const customClicks = useMemo(() => customRows.reduce((a, r) => a + (r.clicks || 0), 0), [customRows]);
  const customCpc = customClicks > 0 && customSpend > 0 ? customSpend / customClicks : null;
  const customCtr = customImpressions > 0 && customClicks > 0 ? (customClicks / customImpressions) * 100 : null;
  const customLeadsCount = customLeads.length;
  const customCpl = customLeadsCount > 0 ? customSpend / customLeadsCount : null;
  const customCalls = useMemo(() => {
    return customLeads.filter((l) => l.lead_type === "phone_call" || (l.channel === "google_lsa" && !l.message)).length;
  }, [customLeads]);
  const customMsgs = useMemo(() => {
    return customLeads.filter((l) => l.lead_type === "message" || Boolean(l.message) || l.channel === "meta_ads").length;
  }, [customLeads]);

  const customLocations = useMemo(() => {
    const locMap = new Map<string, number>();
    for (const l of customLeads) {
      const loc = l.location?.display_name;
      if (loc && loc.trim()) {
        locMap.set(loc.trim(), (locMap.get(loc.trim()) || 0) + 1);
      }
    }
    return [...locMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [customLeads]);

  return (
    <>
      <PageHead eyebrow={`Informes y Auditoría · ${clientName}`} title="Informes">
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Link href="/clientes" className="btn btn-outline" style={{ padding: "8px 14px", fontSize: "13px" }}>
            ← Volver a Resumen
          </Link>
        </div>
      </PageHead>

      {/* ── Barra de Control: Tipo de Informe y Filtro por Canal ── */}
      <div className="pc-date-filter-bar">
        {/* Fila A: Tipo de Informe */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, minWidth: "55px" }}>
            Vista:
          </span>
          <div className="pc-date-presets">
            <button
              type="button"
              className={`pc-date-pill ${activeTab === "mensuales" ? "is-active" : ""}`}
              onClick={() => setActiveTab("mensuales")}
            >
              📁 Informes Mensuales
            </button>
            <button
              type="button"
              className={`pc-date-pill ${activeTab === "semanales" ? "is-active" : ""}`}
              onClick={() => setActiveTab("semanales")}
            >
              📅 Informes Semanales
            </button>
            <button
              type="button"
              className={`pc-date-pill ${activeTab === "fechas" ? "is-active" : ""}`}
              onClick={() => setActiveTab("fechas")}
            >
              🗓️ Consultar por Fecha
            </button>
          </div>
        </div>

        {/* Fila B: Filtro de Canal */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", borderTop: "1px dashed var(--line, #e3dfd7)", paddingTop: "10px" }}>
          <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, minWidth: "55px" }}>
            Canal:
          </span>
          <div className="pc-date-presets">
            <button
              type="button"
              className={`pc-date-pill ${channelFilter === "all" ? "is-active" : ""}`}
              onClick={() => {
                setChannelFilter("all");
                setSelectedAccounts([]);
              }}
            >
              Todos los Canales
            </button>
            <button
              type="button"
              className={`pc-date-pill ${channelFilter === "google_lsa" ? "is-active" : ""}`}
              onClick={() => {
                setChannelFilter("google_lsa");
                setSelectedAccounts([]);
              }}
            >
              <span className="dot dot-lsa" style={{ display: "inline-block", marginRight: "4px" }} />
              Google LSA
            </button>
            <button
              type="button"
              className={`pc-date-pill ${channelFilter === "meta_ads" ? "is-active" : ""}`}
              onClick={() => {
                setChannelFilter("meta_ads");
                setSelectedAccounts([]);
              }}
            >
              <span className="dot dot-meta" style={{ display: "inline-block", marginRight: "4px" }} />
              Meta Ads
            </button>
          </div>
        </div>

        {/* Fila C: Filtro de Cuentas / Anuncios */}
        {channelFilter !== "all" && accountOptions.length > 1 && (
          <AccountFilterBar
            options={accountOptions}
            selectedIds={selectedAccounts}
            onChange={setSelectedAccounts}
            label={channelFilter === "google_lsa" ? "Cuentas LSA:" : "Campañas / Anuncios:"}
          />
        )}
      </div>

      {/* ── TAB 1: INFORMES MENSUALES ── */}
      {activeTab === "mensuales" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Sub-barra de Selección de Mes (Mes en curso, Mes anterior, Selector histórico) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              background: "var(--paper)",
              padding: "12px 16px",
              border: "1px solid var(--line)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                Período mensual:
              </span>
              <button
                type="button"
                className={`pc-date-pill ${selectedPeriod === currentPeriodId ? "is-active" : ""}`}
                onClick={() => setSelectedPeriod(currentPeriodId)}
              >
                🔵 {currentStats.meta.label} <span style={{ fontSize: "11px", opacity: 0.85 }}>(En curso)</span>
              </button>
              <button
                type="button"
                className={`pc-date-pill ${selectedPeriod === prevPeriodId ? "is-active" : ""}`}
                onClick={() => setSelectedPeriod(prevPeriodId)}
              >
                🟢 {prevStats.meta.label}{" "}
                <span style={{ fontSize: "11px", opacity: 0.85 }}>
                  {prevStats.meta.isClosed ? "(Mes anterior · Consolidado)" : "(Mes anterior)"}
                </span>
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label
                htmlFor="period-selector"
                style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}
              >
                Filtrar meses anteriores:
              </label>
              <select
                id="period-selector"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                style={{
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontWeight: 600,
                  background: "var(--white)",
                  border: "1.5px solid var(--line)",
                  borderRadius: 0,
                  color: "var(--ink)",
                  cursor: "pointer",
                }}
              >
                {availablePeriodIds.map((pId) => {
                  const m = getPeriodMeta(pId);
                  return (
                    <option key={pId} value={pId}>
                      {m.label} {m.isCurrent ? "· En curso" : m.isClosed ? "· Consolidado" : "· Cerrando"}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Tarjeta Principal del Mes Activo Seleccionado */}
          <Card
            title={
              activeStats.meta.isCurrent
                ? `Informe Mensual en Curso · ${activeStats.meta.label}`
                : activeStats.meta.isClosed
                ? `Informe Mensual Consolidado · ${activeStats.meta.label}`
                : `Informe Mensual · ${activeStats.meta.label}`
            }
          >
            <div style={{ padding: "10px 0" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: "1.25rem", color: "var(--ink)" }}>
                    {activeStats.meta.label} {channelFilter !== "all" && `(${channelName(channelFilter)})`}
                  </h3>
                  <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                    {activeStats.meta.isCurrent
                      ? `Período en curso auditado (01 ${activeStats.meta.monthName.toLowerCase()} ${activeStats.meta.year} - hoy)`
                      : `Período cerrado y conciliado (01 ${activeStats.meta.monthName.toLowerCase()} ${activeStats.meta.year} - ${activeStats.meta.end.slice(8)} ${activeStats.meta.monthName.toLowerCase()} ${activeStats.meta.year})`}
                  </span>
                </div>

                <div>
                  {activeStats.meta.isClosed ? (
                    <span
                      style={{
                        background: "#edf7f0",
                        color: "var(--good, #1f6b43)",
                        border: "1px solid #c3e6cb",
                        padding: "5px 12px",
                        borderRadius: 0,
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      ✅ Mes Consolidado · Auditoría Definitiva
                    </span>
                  ) : (
                    <span
                      style={{
                        background: "#fff8e6",
                        color: "#8f6000",
                        border: "1px solid #ffe8a3",
                        padding: "5px 12px",
                        borderRadius: 0,
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      ⏳ En curso · Cierre previsto 5 de {activeStats.meta.nextMonthName}
                    </span>
                  )}
                </div>
              </div>

              {/* KPIs rápidos del mes seleccionado */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "12px",
                  marginBottom: "20px",
                  background: "var(--paper)",
                  padding: "14px",
                  borderRadius: 0,
                  border: "1px solid var(--line)",
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Leads recibidos
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>
                    {fmt.int(activeStats.leadsCount)}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Inversión
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>
                    {fmt.eur0(activeStats.spend)}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    CPL Medio
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>
                    {fmt.eur(activeStats.cpl)}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Impresiones
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>
                    {fmt.int(activeStats.impressions)}
                  </p>
                </div>
                {activeStats.clicks > 0 && (
                  <>
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                        Clics (Meta)
                      </span>
                      <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>
                        {fmt.int(activeStats.clicks)}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                        CPC Medio
                      </span>
                      <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>
                        {activeStats.cpc != null ? fmt.eur(activeStats.cpc) : "—"}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                        CTR (Meta)
                      </span>
                      <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--accent)" }}>
                        {activeStats.ctr != null ? `${activeStats.ctr.toFixed(2)} %` : "—"}
                      </p>
                    </div>
                  </>
                )}
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Ventas cerradas
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--good, #1f6b43)" }}>
                    {fmt.int(activeStats.closed)}
                  </p>
                </div>
              </div>

              {/* Aviso consolidación / PDF */}
              <div
                style={{
                  background: activeStats.meta.isClosed ? "#edf7f0" : "#fff8e6",
                  border: `1px solid ${activeStats.meta.isClosed ? "#c3e6cb" : "#ffe8a3"}`,
                  borderRadius: 0,
                  padding: "12px 16px",
                  marginBottom: "20px",
                  fontSize: "13px",
                  color: activeStats.meta.isClosed ? "var(--good, #1f6b43)" : "#8f6000",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span>{activeStats.meta.isClosed ? "✅" : "⏳"}</span>
                <div>
                  {activeStats.meta.isClosed ? (
                    <span>
                      <strong>Informe Mensual Consolidado:</strong> El período de <strong>{activeStats.meta.label}</strong> está cerrado y sus datos de captación, facturación e incidencias son definitivos. El informe ejecutivo está disponible para su descarga en PDF y la hoja de cálculo de Google Sheets está lista para consultar y descargar.
                    </span>
                  ) : (
                    <span>
                      <strong>Descarga en PDF programada:</strong> Disponible a partir del{" "}
                      <strong>5 de {activeStats.meta.nextMonthName} de {activeStats.meta.nextMonthYear}</strong>. Los informes mensuales se consolidan tras el día 5 del siguiente
                      mes para dar tiempo a la conciliación definitiva de cierres, importes e incidencias con el cliente.
                    </span>
                  )}
                </div>
              </div>

              {/* Botones de acción del informe */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <Link
                  href={`/clientes/informes/${selectedPeriod}`}
                  className="btn btn-ink"
                  style={{ padding: "8px 16px", fontSize: "13px" }}
                >
                  Ver informe interactivo completo →
                </Link>

                {activeStats.meta.isClosed && (
                  <a
                    href={`/clientes/informes/${selectedPeriod}?print=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                    style={{
                      padding: "8px 16px",
                      fontSize: "13px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      textDecoration: "none",
                    }}
                  >
                    <span>📥 Descargar / Imprimir Informe PDF</span>
                  </a>
                )}

                {activeSheet?.spreadsheetId && (
                  <>
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${activeSheet.spreadsheetId}/export?format=xlsx`}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="btn btn-outline"
                      style={{
                        padding: "8px 16px",
                        fontSize: "13px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        textDecoration: "none",
                      }}
                      title="Descargar archivo Excel de la hoja de leads"
                    >
                      <span>📥 Descargar Sheet (.xlsx)</span>
                    </a>

                    <a
                      href={activeSheet.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline"
                      style={{
                        padding: "8px 16px",
                        fontSize: "13px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        textDecoration: "none",
                      }}
                    >
                      <span>📊 Abrir Google Sheet ↗</span>
                    </a>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Tarjeta destacada visible del Mes Anterior cuando estamos viendo el Mes en Curso */}
          {selectedPeriod === currentPeriodId && (
            <Card title={`Mes Anterior Consolidado · ${prevStats.meta.label}`}>
              <div style={{ padding: "8px 0" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
                    El período de <strong>{prevStats.meta.label}</strong> ya ha finalizado y cuenta con su conciliación definitiva. Puedes descargar el informe PDF, acceder a su Google Sheet correspondiente o visualizarlo directamente aquí.
                  </p>
                  <span
                    style={{
                      background: "#edf7f0",
                      color: "var(--good, #1f6b43)",
                      border: "1px solid #c3e6cb",
                      padding: "4px 10px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    ✅ Consolidado
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "10px",
                    background: "var(--paper)",
                    padding: "12px",
                    border: "1px solid var(--line)",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      Leads recibidos
                    </span>
                    <p style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "var(--ink)" }}>
                      {fmt.int(prevStats.leadsCount)}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      Inversión
                    </span>
                    <p style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "var(--ink)" }}>
                      {fmt.eur0(prevStats.spend)}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      CPL Medio
                    </span>
                    <p style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "var(--ink)" }}>
                      {fmt.eur(prevStats.cpl)}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      Ventas cerradas
                    </span>
                    <p style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "var(--good, #1f6b43)" }}>
                      {fmt.int(prevStats.closed)}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedPeriod(prevPeriodId)}
                    className="btn btn-ink"
                    style={{ padding: "7px 14px", fontSize: "12.5px" }}
                  >
                    👁️ Ver y abrir {prevStats.meta.label} aquí
                  </button>

                  <Link
                    href={`/clientes/informes/${prevPeriodId}`}
                    className="btn btn-outline"
                    style={{ padding: "7px 14px", fontSize: "12.5px" }}
                  >
                    📄 Ver informe completo →
                  </Link>

                  <a
                    href={`/clientes/informes/${prevPeriodId}?print=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                    style={{
                      padding: "7px 14px",
                      fontSize: "12.5px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      textDecoration: "none",
                    }}
                  >
                    <span>📥 Descargar Informe PDF</span>
                  </a>

                  {prevSheet?.spreadsheetId && (
                    <>
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${prevSheet.spreadsheetId}/export?format=xlsx`}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="btn btn-outline"
                        style={{
                          padding: "7px 14px",
                          fontSize: "12.5px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          textDecoration: "none",
                        }}
                      >
                        <span>📥 Descargar Sheet (.xlsx)</span>
                      </a>
                      <a
                        href={prevSheet.spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline"
                        style={{
                          padding: "7px 14px",
                          fontSize: "12.5px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          textDecoration: "none",
                        }}
                      >
                        <span>📊 Abrir Google Sheet ↗</span>
                      </a>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Incrustación interactiva del Google Sheet del periodo seleccionado */}
          <MonthlySheetEmbed
            period={selectedPeriod}
            periodLabel={activeStats.meta.label}
            initialSheet={activeSheet}
          />

          {/* Ranking interno de localidades y análisis de horas punta del periodo */}
          <div className="pc-grid-2">
            <Card
              title={`Ranking de Ubicaciones (${activeStats.meta.label})${activeAccountLabel ? ` · ${activeAccountLabel}` : ""}`}
              action={
                <span className="pc-muted">
                  {activeAccountLabel || (channelFilter === "all" ? "Todos los canales" : channelName(channelFilter))}
                </span>
              }
            >
              <div style={{ padding: "4px 0" }}>
                <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 10px" }}>
                  {activeAccountLabel
                    ? `Localidades internas para ${activeAccountLabel} en ${activeStats.meta.label}:`
                    : `Localidades con mayor volumen de solicitudes en ${activeStats.meta.label}:`}
                </p>
                <LocationRankingBars items={activeStats.locations} />
              </div>
            </Card>

            <Card
              title={`Picos de Actividad Horaria (${activeStats.meta.label})`}
              action={<span className="pc-muted">{activeStats.leadsCount} leads auditados</span>}
            >
              <ActivityPeakChart
                leads={activeStats.leads}
                title="Picos de Actividad Mensual"
                subtitle={`Distribución horaria acumulada de ${activeStats.meta.label}`}
                activeAccountLabel={activeAccountLabel}
              />
            </Card>
          </div>

          {/* Archivo Histórico de Todos los Meses Disponibles */}
          {availablePeriodIds.length > 1 && (
            <Card title="Archivo Histórico de Meses y Hojas de Cálculo">
              <div style={{ overflowX: "auto" }}>
                <table className="pc-table tabular" style={{ width: "100%", textAlign: "left", fontSize: "13px" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "8px 12px" }}>Mes / Período</th>
                      <th style={{ padding: "8px 12px" }}>Estado</th>
                      <th style={{ padding: "8px 12px" }}>Leads</th>
                      <th style={{ padding: "8px 12px" }}>Inversión</th>
                      <th style={{ padding: "8px 12px" }}>CPL</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availablePeriodIds.map((pId) => {
                      const m = getPeriodMeta(pId);
                      const s = computeStatsForPeriod(pId);
                      const sheet = initialSheetsMap[pId];
                      const isCurrentActive = pId === selectedPeriod;

                      return (
                        <tr
                          key={pId}
                          style={{
                            background: isCurrentActive ? "rgba(15, 23, 42, 0.04)" : "transparent",
                            fontWeight: isCurrentActive ? 600 : 400,
                          }}
                        >
                          <td style={{ padding: "10px 12px" }}>
                            <strong>{m.label}</strong>
                            {m.isCurrent && (
                              <span style={{ marginLeft: "6px", fontSize: "11px", color: "var(--accent)" }}>
                                (En curso)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            {m.isClosed ? (
                              <span style={{ color: "var(--good, #1f6b43)", fontWeight: 700, fontSize: "12px" }}>
                                ✅ Consolidado
                              </span>
                            ) : (
                              <span style={{ color: "#8f6000", fontWeight: 700, fontSize: "12px" }}>
                                ⏳ En curso
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px" }}>{fmt.int(s.leadsCount)}</td>
                          <td style={{ padding: "10px 12px" }}>{fmt.eur0(s.spend)}</td>
                          <td style={{ padding: "10px 12px" }}>{fmt.eur(s.cpl)}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => setSelectedPeriod(pId)}
                                className="btn btn-outline"
                                style={{ padding: "4px 8px", fontSize: "11px" }}
                                title="Ver en esta vista interactiva"
                              >
                                {isCurrentActive ? "✓ Activo" : "Ver aquí"}
                              </button>
                              <Link
                                href={`/clientes/informes/${pId}`}
                                className="btn btn-outline"
                                style={{ padding: "4px 8px", fontSize: "11px" }}
                                title="Ver página de informe completo"
                              >
                                Informe →
                              </Link>
                              {m.isClosed && (
                                <a
                                  href={`/clientes/informes/${pId}?print=1`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-outline"
                                  style={{ padding: "4px 8px", fontSize: "11px" }}
                                  title="Guardar o descargar informe en PDF"
                                >
                                  📥 PDF
                                </a>
                              )}
                              {sheet?.spreadsheetId && (
                                <a
                                  href={`https://docs.google.com/spreadsheets/d/${sheet.spreadsheetId}/export?format=xlsx`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="btn btn-outline"
                                  style={{ padding: "4px 8px", fontSize: "11px" }}
                                  title="Descargar Google Sheet en formato Excel (.xlsx)"
                                >
                                  📥 .xlsx
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── TAB 2: INFORMES SEMANALES ── */}
      {activeTab === "semanales" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {weeklyPeriods.map((w) => (
            <Card
              key={w.id}
              title={`${w.label}${channelFilter !== "all" ? ` · ${channelName(channelFilter)}` : ""}`}
              action={
                w.isCurrent ? (
                  <span
                    style={{
                      background: "var(--paper)",
                      color: "var(--ink)",
                      border: "1px solid var(--ink)",
                      padding: "3px 10px",
                      borderRadius: 0,
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    ⚡ Semana en curso
                  </span>
                ) : (
                  <span
                    style={{
                      background: "var(--paper)",
                      color: "var(--muted)",
                      border: "1px solid var(--line)",
                      padding: "3px 10px",
                      borderRadius: 0,
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    ✅ Cerrada
                  </span>
                )
              }
            >
              <div style={{ padding: "8px 0" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      Leads
                    </span>
                    <p style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "var(--ink)" }}>
                      {fmt.int(w.leadsCount)}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      Inversión
                    </span>
                    <p style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "var(--ink)" }}>
                      {fmt.eur0(w.spend)}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      CPL
                    </span>
                    <p style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "#0284c7" }}>
                      {fmt.eur(w.cpl)}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      Impresiones
                    </span>
                    <p style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "var(--ink)" }}>
                      {fmt.int(w.impressions)}
                    </p>
                  </div>
                  {w.clicks > 0 && (
                    <>
                      <div>
                        <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                          Clics (Meta)
                        </span>
                        <p style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "var(--ink)" }}>
                          {fmt.int(w.clicks)}
                        </p>
                      </div>
                      <div>
                        <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                          CPC Medio
                        </span>
                        <p style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "var(--ink)" }}>
                          {w.cpc != null ? fmt.eur(w.cpc) : "—"}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <RatioBar
                  leftLabel="📞 Llamadas"
                  leftCount={w.calls}
                  rightLabel="💬 Mensajes"
                  rightCount={w.msgs}
                  accent="blue"
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── TAB 3: CONSULTAR POR FECHA (ANALÍTICAS A MEDIDA) ── */}
      {activeTab === "fechas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <Card title="Selector de Intervalo">
            <div style={{ padding: "8px 0" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", marginBottom: "16px" }}>
                <label className="pc-date-input-group">
                  <span className="pc-date-input-label">Desde:</span>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="pc-date-picker-input"
                  />
                </label>
                <label className="pc-date-input-group">
                  <span className="pc-date-input-label">Hasta:</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="pc-date-picker-input"
                  />
                </label>
              </div>

              {customLeadsCount === 0 && customRows.length === 0 ? (
                <Empty>No hay actividad registrada entre el {customFrom} y el {customTo} para {channelFilter === "all" ? "ningún canal" : channelName(channelFilter)}.</Empty>
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                      gap: "12px",
                      marginBottom: "20px",
                      background: "var(--paper)",
                      padding: "14px",
                      borderRadius: 0,
                      border: "1px solid var(--line)",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                        Leads recibidos
                      </span>
                      <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>
                        {fmt.int(customLeadsCount)}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                        Inversión
                      </span>
                      <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>
                        {fmt.eur0(customSpend)}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                        Coste por Lead
                      </span>
                      <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>
                        {fmt.eur(customCpl)}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                        Impresiones
                      </span>
                      <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>
                        {fmt.int(customImpressions)}
                      </p>
                    </div>
                    {customClicks > 0 && (
                      <>
                        <div>
                          <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                            Clics (Meta)
                          </span>
                          <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>
                            {fmt.int(customClicks)}
                          </p>
                        </div>
                        <div>
                          <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                            CPC Medio
                          </span>
                          <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>
                            {customCpc != null ? fmt.eur(customCpc) : "—"}
                          </p>
                        </div>
                        <div>
                          <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                            CTR (Meta)
                          </span>
                          <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--accent)" }}>
                            {customCtr != null ? `${customCtr.toFixed(2)} %` : "—"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pc-grid-2">
                    <div>
                      <h4 style={{ fontSize: "13px", margin: "0 0 10px", color: "var(--ink)", fontWeight: 700 }}>
                        Operativa (Llamadas vs Mensajes)
                      </h4>
                      <RatioBar
                        leftLabel="📞 Llamadas"
                        leftCount={customCalls}
                        rightLabel="💬 Mensajes"
                        rightCount={customMsgs}
                        accent="blue"
                      />
                    </div>

                    <div>
                      <h4 style={{ fontSize: "13px", margin: "0 0 10px", color: "var(--ink)", fontWeight: 700 }}>
                        Ranking de Ubicaciones {activeAccountLabel ? `(${activeAccountLabel})` : "en este intervalo"}
                      </h4>
                      <LocationRankingBars items={customLocations} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Picos de actividad para el intervalo personalizado */}
          <Card>
            <ActivityPeakChart
              leads={customLeads}
              title={`Horas y Días de Mayor Actividad${activeAccountLabel ? ` · ${activeAccountLabel}` : ""}`}
              subtitle={`Distribución de solicitudes y calidad (${fmt.day(customFrom)} al ${fmt.day(customTo)})`}
              activeAccountLabel={activeAccountLabel}
            />
          </Card>
        </div>
      )}
    </>
  );
}
