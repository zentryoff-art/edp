"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { DailyMetric, Lead, PortalBooking, Incident, Report } from "@/lib/portal/types";
import { fmt, isoDay, channelName, weekly } from "@/lib/portal/metrics";
import { LeadsChart } from "@/components/portal/LeadsChart";
import { Card, Empty, PageHead, StatTile, LocationRankingBars, RatioBar } from "@/components/portal/ui";
import { extractAccountOptions, matchLeadAccount, matchMetricAccount } from "@/lib/portal/accounts";
import { AccountFilterBar } from "@/components/portal/AccountFilterBar";

interface DashboardViewProps {
  initialRows: DailyMetric[];
  initialLeads: Lead[];
  bookings: PortalBooking[];
  incidents: Incident[];
  reports: Report[];
  client: { id: string; name: string };
  fullName: string;
  bienvenida?: boolean;
}

type FilterPreset = "mes" | "esta_semana" | "hoy" | "historico" | "custom";
type ChannelFilter = "all" | "google_lsa" | "meta_ads";

export function DashboardView({
  initialRows,
  initialLeads,
  bookings,
  incidents,
  reports,
  client,
  fullName,
  bienvenida,
}: DashboardViewProps) {
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => isoDay(today), [today]);

  // Mes en curso dinámico
  const currentMonthStart = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  }, [today]);

  const currentMonthEnd = useMemo(() => {
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    const lastDay = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  }, [today]);

  const currentMonthName = useMemo(() => {
    const name = today.toLocaleString("es-ES", { month: "long" });
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [today]);
  
  // Lunes de la semana actual
  const startOfWeekIso = useMemo(() => {
    const t = new Date(today.getTime());
    const dayOfWeek = t.getDay() === 0 ? 6 : t.getDay() - 1; // Lunes = 0
    t.setDate(t.getDate() - dayOfWeek);
    return isoDay(t);
  }, [today]);


  // Estado de los filtros: Fechas, Canal y Cuentas
  const [preset, setPreset] = useState<FilterPreset>("mes");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [customFrom, setCustomFrom] = useState<string>(currentMonthStart);
  const [customTo, setCustomTo] = useState<string>(todayIso);

  // Opciones de cuentas disponibles para el canal activo
  const accountOptions = useMemo(() => {
    return extractAccountOptions(initialRows, initialLeads, channelFilter);
  }, [initialRows, initialLeads, channelFilter]);

  // Rango activo
  const activeRange = useMemo(() => {
    switch (preset) {
      case "mes":
        return {
          from: currentMonthStart,
          to: currentMonthEnd,
          label: `Este Mes (${currentMonthName} ${today.getFullYear()})`,
        };
      case "esta_semana":
        return { from: startOfWeekIso, to: todayIso, label: `Esta semana (${fmt.day(startOfWeekIso)} - ${fmt.day(todayIso)})` };
      case "hoy":
        return { from: todayIso, to: todayIso, label: `Hoy (${fmt.day(todayIso)})` };
      case "historico":
        return { from: "2020-01-01", to: todayIso, label: "Histórico completo" };
      case "custom":
        return { from: customFrom, to: customTo, label: `Personalizado (${customFrom} a ${customTo})` };
    }
  }, [preset, currentMonthStart, currentMonthEnd, currentMonthName, startOfWeekIso, todayIso, customFrom, customTo, today]);

  // Filtrado reactivo de métricas y leads (por fecha, canal Y cuentas seleccionadas)
  const filteredRows = useMemo(() => {
    return initialRows.filter((r) => {
      const matchDate = r.date >= activeRange.from && r.date <= activeRange.to;
      const matchChannel = channelFilter === "all" || r.channel === channelFilter;
      const matchAccount = matchMetricAccount(r, selectedAccounts);
      return matchDate && matchChannel && matchAccount;
    });
  }, [initialRows, activeRange, channelFilter, selectedAccounts]);

  const filteredLeads = useMemo(() => {
    return initialLeads.filter((l) => {
      const d = (l.created_at || "").slice(0, 10);
      const matchDate = d >= activeRange.from && d <= activeRange.to;
      const matchChannel = channelFilter === "all" || l.channel === channelFilter;
      const matchAccount = matchLeadAccount(l, selectedAccounts);
      return matchDate && matchChannel && matchAccount;
    });
  }, [initialLeads, activeRange, channelFilter, selectedAccounts]);

  // Filas y leads de la fecha completa (para la comparativa conjunta entre canales)
  const dateOnlyRows = useMemo(() => {
    return initialRows.filter((r) => r.date >= activeRange.from && r.date <= activeRange.to);
  }, [initialRows, activeRange]);

  const dateOnlyLeads = useMemo(() => {
    return initialLeads.filter((l) => {
      const d = (l.created_at || "").slice(0, 10);
      return d >= activeRange.from && d <= activeRange.to;
    });
  }, [initialLeads, activeRange]);

  // Totales del período seleccionado y canal
  const spend = useMemo(() => filteredRows.reduce((a, r) => a + (r.spend || 0), 0), [filteredRows]);
  const leadsCount = filteredLeads.length;
  const cpl = leadsCount > 0 ? spend / leadsCount : null;

  const closedLeads = useMemo(() => {
    return filteredLeads.filter(
      (l) => l.status === "cerrado" || l.google_lead_status === "BOOKED" || l.qualification?.status === "venta"
    );
  }, [filteredLeads]);
  const closedCount = closedLeads.length;

  const realRevenue = useMemo(() => {
    return closedLeads.reduce((acc, l) => {
      const isEstimate = l.computed_signals?.meta_value_source === "range_estimate";
      return acc + (!isEstimate ? (l.qualification?.sale_amount || l.sale_amount || 0) : 0);
    }, 0);
  }, [closedLeads]);

  const estimateRevenue = useMemo(() => {
    return closedLeads.reduce((acc, l) => {
      const isEstimate = l.computed_signals?.meta_value_source === "range_estimate";
      return acc + (isEstimate ? (l.computed_signals?.meta_value || 0) : 0);
    }, 0);
  }, [closedLeads]);

  const totalRevenue = realRevenue + estimateRevenue;
  const hasEstimates = estimateRevenue > 0;
  const roas = spend > 0 && totalRevenue > 0 ? totalRevenue / spend : null;

  // Desglose de Operativa
  const callCount = useMemo(() => {
    return filteredLeads.filter(
      (l) => l.lead_type === "phone_call" || (l.channel === "google_lsa" && !l.message)
    ).length;
  }, [filteredLeads]);

  const msgCount = useMemo(() => {
    return filteredLeads.filter(
      (l) => l.lead_type === "message" || Boolean(l.message) || l.channel === "meta_ads"
    ).length;
  }, [filteredLeads]);

  const chargedCount = useMemo(() => filteredLeads.filter((l) => l.lead_charged === true).length, [filteredLeads]);
  const inReviewCount = useMemo(() => {
    return filteredLeads.filter((l) => l.channel === "google_lsa" && l.lead_charged !== true).length;
  }, [filteredLeads]);

  const disputedCount = useMemo(() => {
    return filteredLeads.filter(
      (l) => l.status === "rechazado" || l.google_lead_status === "DECLINED" || l.qualification?.status === "rechazado"
    ).length;
  }, [filteredLeads]);

  // Rendimiento de Anuncios Google LSA
  const totalImpressions = useMemo(() => filteredRows.reduce((a, r) => a + (r.impressions || 0), 0), [filteredRows]);
  const topImpRows = useMemo(() => filteredRows.filter((r) => r.top_impression_percentage != null), [filteredRows]);
  const avgTopImp = useMemo(() => {
    return topImpRows.length > 0
      ? topImpRows.reduce((a, r) => a + r.top_impression_percentage!, 0) / topImpRows.length
      : null;
  }, [topImpRows]);

  const absTopImpRows = useMemo(() => filteredRows.filter((r) => r.absolute_top_impression_percentage != null), [filteredRows]);
  const avgAbsTopImp = useMemo(() => {
    return absTopImpRows.length > 0
      ? absTopImpRows.reduce((a, r) => a + r.absolute_top_impression_percentage!, 0) / absTopImpRows.length
      : null;
  }, [absTopImpRows]);

  // Rendimiento de Anuncios Meta Ads (CPC / Clicks / CTR / CPM)
  const metaRows = useMemo(() => filteredRows.filter((r) => r.channel === "meta_ads"), [filteredRows]);
  const metaSpend = useMemo(() => metaRows.reduce((a, r) => a + (r.spend || 0), 0), [metaRows]);
  const metaImpressions = useMemo(() => metaRows.reduce((a, r) => a + (r.impressions || 0), 0), [metaRows]);
  const metaClicks = useMemo(() => metaRows.reduce((a, r) => a + (r.clicks || 0), 0), [metaRows]);
  const metaInlineClicks = useMemo(() => metaRows.reduce((a, r) => a + (r.inline_link_clicks || 0), 0), [metaRows]);
  const metaLeadsCount = useMemo(() => filteredLeads.filter((l) => l.channel === "meta_ads").length, [filteredLeads]);
  const metaCpc = metaClicks > 0 && metaSpend > 0 ? metaSpend / metaClicks : null;
  const metaCtr = metaImpressions > 0 && metaClicks > 0 ? (metaClicks / metaImpressions) * 100 : null;
  const metaCpm = metaImpressions > 0 && metaSpend > 0 ? (metaSpend / metaImpressions) * 1000 : null;
  const metaConvRate = metaClicks > 0 && metaLeadsCount > 0 ? (metaLeadsCount / metaClicks) * 100 : null;

  const hasMeta = useMemo(() => filteredRows.some((r) => r.channel === "meta_ads") || filteredLeads.some((l) => l.channel === "meta_ads"), [filteredRows, filteredLeads]);
  const hasLsa = useMemo(() => filteredRows.some((r) => r.channel === "google_lsa") || filteredLeads.some((l) => l.channel === "google_lsa"), [filteredRows, filteredLeads]);

  // Ranking de Ubicaciones
  const topLocations = useMemo(() => {
    const locMap = new Map<string, number>();
    for (const l of filteredLeads) {
      const loc = l.location?.display_name;
      if (loc && loc.trim()) {
        locMap.set(loc.trim(), (locMap.get(loc.trim()) || 0) + 1);
      }
    }
    return [...locMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLeads]);

  // Gráfica de 12 semanas (filtrada opcionalmente por canal)
  const weeks = useMemo(() => {
    const baseRows = channelFilter === "all" ? initialRows : initialRows.filter((r) => r.channel === channelFilter);
    const baseLeads = channelFilter === "all" ? initialLeads : initialLeads.filter((l) => l.channel === channelFilter);

    return weekly(baseRows, 12, new Date(today.getTime() - 86400000)).map((w) => {
      const weekLeads = baseLeads.filter((l) => {
        const d = (l.created_at || "").slice(0, 10);
        return d >= w.start && d <= w.end;
      });
      const hotLeads = weekLeads.filter(
        (l) => (l.score && l.score >= 4) || (l.computed_signals?.internal_rating && l.computed_signals.internal_rating >= 4)
      );
      const restLeads = weekLeads.length - hotLeads.length;

      return {
        label: fmt.day(w.start),
        sub: `Semana del ${fmt.day(w.start)} al ${fmt.day(w.end)}`,
        hot: hotLeads.length || w.hot,
        rest: restLeads > 0 ? restLeads : w.rest,
        spend: w.spend,
      };
    });
  }, [initialRows, initialLeads, today, channelFilter]);

  // Comparativa conjunta entre canales en la fecha seleccionada
  const channelComparison = useMemo(() => {
    const channelKeys = Array.from(new Set([...dateOnlyRows.map((r) => r.channel), ...dateOnlyLeads.map((l) => l.channel)]));
    return channelKeys.map((channel) => {
      const chRows = dateOnlyRows.filter((r) => r.channel === channel);
      const chLeads = dateOnlyLeads.filter((l) => l.channel === channel);
      const chSpend = chRows.reduce((a, r) => a + (r.spend || 0), 0);
      const chImpressions = chRows.reduce((a, r) => a + (r.impressions || 0), 0);
      const chClicks = chRows.reduce((a, r) => a + (r.clicks || 0), 0);
      const chClosed = chLeads.filter(
        (l) => l.status === "cerrado" || l.google_lead_status === "BOOKED" || l.qualification?.status === "venta"
      ).length;
      return {
        channel,
        leads: chLeads.length,
        spend: chSpend,
        cpl: chLeads.length > 0 ? chSpend / chLeads.length : null,
        impressions: chImpressions,
        clicks: chClicks,
        cpc: chClicks > 0 && chSpend > 0 ? chSpend / chClicks : null,
        closed: chClosed,
      };
    }).sort((a, b) => b.leads - a.leads);
  }, [dateOnlyRows, dateOnlyLeads]);

  const first = (fullName || "").split(" ")[0];

  return (
    <>
      <PageHead eyebrow={`Área de Clientes · ${client.name}`} title={first ? `Hola, ${first}.` : "Resumen"}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Link href="/clientes/informes" className="btn btn-outline" style={{ padding: "8px 14px", fontSize: "13px" }}>
            📊 Ver Informes
          </Link>
          <Link href="/clientes/llamadas" className="btn btn-ink" style={{ padding: "8px 14px", fontSize: "13px" }}>
            Pedir llamada
          </Link>
        </div>
      </PageHead>

      {bienvenida && (
        <p className="pc-msg is-ok" role="status">
          Contraseña guardada. Ya puedes entrar cuando quieras con tu email.
        </p>
      )}

      {/* ── Barra Interactiva de Filtros: Canal y Fechas ── */}
      <div className="pc-date-filter-bar">
        {/* Fila 1: Filtro de Canal */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
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

        {/* Fila 2: Filtro de Cuentas / Anuncios (solo en pestaña específica del canal si tiene múltiples) */}
        {channelFilter !== "all" && accountOptions.length > 1 && (
          <AccountFilterBar
            options={accountOptions}
            selectedIds={selectedAccounts}
            onChange={setSelectedAccounts}
            label={channelFilter === "google_lsa" ? "Cuentas LSA:" : "Campañas / Anuncios:"}
          />
        )}

        {/* Fila 3: Filtro de Fecha */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", borderTop: "1px dashed var(--line, #e3dfd7)", paddingTop: "10px" }}>
          <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, minWidth: "55px" }}>
            Fecha:
          </span>
          <div className="pc-date-presets">
            <button
              type="button"
              className={`pc-date-pill ${preset === "mes" ? "is-active" : ""}`}
              onClick={() => setPreset("mes")}
            >
              📁 Este Mes
            </button>
            <button
              type="button"
              className={`pc-date-pill ${preset === "esta_semana" ? "is-active" : ""}`}
              onClick={() => setPreset("esta_semana")}
            >
              📅 Esta Semana
            </button>
            <button
              type="button"
              className={`pc-date-pill ${preset === "hoy" ? "is-active" : ""}`}
              onClick={() => setPreset("hoy")}
            >
              ⚡ Hoy
            </button>
            <button
              type="button"
              className={`pc-date-pill ${preset === "historico" ? "is-active" : ""}`}
              onClick={() => setPreset("historico")}
            >
              📚 Histórico
            </button>
            <button
              type="button"
              className={`pc-date-pill ${preset === "custom" ? "is-active" : ""}`}
              onClick={() => setPreset("custom")}
            >
              🗓️ Personalizado
            </button>
          </div>
        </div>

        {/* Input Selector Personalizado si está activo */}
        {preset === "custom" && (
          <div className="pc-date-custom-inputs">
            <label className="pc-date-input-group">
              <span className="pc-date-input-label">Desde</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="pc-date-picker-input"
              />
            </label>
            <label className="pc-date-input-group">
              <span className="pc-date-input-label">Hasta</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="pc-date-picker-input"
              />
            </label>
          </div>
        )}

        {/* Etiqueta del Rango y Canal activo */}
        <div className="pc-date-range-badge">
          <span className="pc-date-range-dot" />
          <span>
            Mostrando datos: <strong>{activeRange.label}</strong>
            {channelFilter !== "all" ? (
              <span> · Canal: <strong>{channelFilter === "google_lsa" ? "Google LSA" : "Meta Ads"}</strong></span>
            ) : (
              <span> · <strong>Todos los canales combinados</strong></span>
            )}
            {selectedAccounts.length > 0 && (
              <span> · Cuentas: <strong>{selectedAccounts.length} de {accountOptions.length} seleccionada(s)</strong></span>
            )}
          </span>
        </div>
      </div>

      {leadsCount === 0 && filteredRows.length === 0 ? (
        <Empty>
          No hay datos registrados en el rango seleccionado ({activeRange.label}) para {channelFilter === "all" ? "ningún canal" : channelFilter === "google_lsa" ? "Google LSA" : "Meta Ads"}. Prueba seleccionando otro período o canal.
        </Empty>
      ) : (
        <>
          {/* ── 1. Stat Tiles Principales ── */}
          <div className="pc-stats">
            <StatTile
              label="Leads recibidos"
              value={fmt.int(leadsCount)}
              vs={channelFilter === "all" ? "total canales" : channelName(channelFilter)}
            />
            <StatTile
              label="Coste por lead (CPL)"
              value={fmt.eur(cpl)}
              goodWhenUp={false}
              vs="inversión / leads"
              hot
            />
            <StatTile
              label="Inversión publicitaria"
              value={fmt.eur0(spend)}
              neutral
              vs={preset === "mes" ? "este mes" : preset === "historico" ? "histórico" : "rango seleccionado"}
            />
            <StatTile
              label="Clientes cerrados"
              value={fmt.int(closedCount)}
              vs="ventas confirmadas"
            />
            <StatTile
              label={hasEstimates ? "ROAS (Mixto)" : "ROAS (Real)"}
              value={roas != null ? `${roas.toFixed(2)}x` : "—"}
              vs={fmt.eur0(totalRevenue)}
              neutral
            />
          </div>

          {/* ── 2. Gráfica Semanal de Leads y Gasto ── */}
          <Card>
            <LeadsChart
              points={weeks}
              title={`Evolución de Leads por semana${channelFilter !== "all" ? ` (${channelName(channelFilter)})` : ""}`}
              caption="Últimas 12 semanas. Pasa el cursor por cada barra para consultar el detalle de leads y gasto."
            />
          </Card>

          {/* ── 3. Cuadrícula de Análisis: Operativa, Anuncios, Ubicaciones y Comparativa de Canales ── */}
          <div className="pc-grid-2">
            {/* Card A: Operativa de Leads */}
            <Card
              title="Operativa de Leads"
              action={
                <span className="pc-muted">
                  {channelFilter === "all" ? "Todos los canales" : channelName(channelFilter)}
                </span>
              }
            >
              <div style={{ padding: "6px 0" }}>
                <RatioBar
                  leftLabel="📞 Llamadas"
                  leftCount={callCount}
                  rightLabel="💬 Mensajes"
                  rightCount={msgCount}
                  accent="blue"
                />
                {channelFilter !== "meta_ads" && (
                  <RatioBar
                    leftLabel="💳 Cobrados por Google"
                    leftCount={chargedCount}
                    rightLabel="⏳ En revisión Google"
                    rightCount={inReviewCount}
                    accent="green"
                  />
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: "1px solid var(--line, #e3dfd7)",
                  }}
                >
                  <div>
                    <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      Disputados / Archivados
                    </span>
                    <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
                      {disputedCount} leads
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      Facturación en Ventas
                    </span>
                    <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "var(--good, #1f6b43)" }}>
                      {fmt.eur0(totalRevenue)}
                      {hasEstimates && (
                        <span style={{ fontSize: 11, fontWeight: 400, color: "var(--muted)", marginLeft: 4 }}>
                          (estimado)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Card B: Rendimiento del Anuncio (Google Ads LSA / Meta Ads) */}
            <Card
              title="Rendimiento del Anuncio"
              action={
                <span className="pc-muted">
                  {channelFilter === "meta_ads"
                    ? "Meta Ads (Insights API)"
                    : channelFilter === "google_lsa"
                    ? "Google Ads API"
                    : hasLsa && hasMeta
                    ? "Google LSA & Meta Ads"
                    : hasMeta
                    ? "Meta Ads (Insights API)"
                    : "Google Ads API"}
                </span>
              }
            >
              <div style={{ padding: "6px 0" }}>
                {/* 1. Modo exclusivo Meta Ads o cliente solo Meta (ej. Duala, Henry, Laterra) */}
                {(channelFilter === "meta_ads" || (channelFilter === "all" && hasMeta && !hasLsa)) ? (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 14, marginBottom: 14 }}>
                      <div>
                        <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                          Impresiones
                        </span>
                        <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>
                          {fmt.int(metaImpressions || totalImpressions)}
                        </p>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>alcance en Facebook/IG</span>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                          Clics Totales
                        </span>
                        <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>
                          {fmt.int(metaClicks)}
                        </p>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          {metaInlineClicks > 0 ? `${fmt.int(metaInlineClicks)} en enlace` : "interacciones de anuncio"}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                          Coste por Clic (CPC)
                        </span>
                        <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>
                          {metaCpc != null ? fmt.eur(metaCpc) : "—"}
                        </p>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>inversión / clics</span>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                          Tasa de Clics (CTR)
                        </span>
                        <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>
                          {metaCtr != null ? `${metaCtr.toFixed(2)} %` : "—"}
                        </p>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>clics / impresiones</span>
                      </div>
                    </div>

                    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                          Conversión Clic a Lead
                        </span>
                        <strong style={{ fontSize: 13, color: "var(--good, #1f6b43)" }}>
                          {metaConvRate != null ? `${metaConvRate.toFixed(1)} %` : "—"}
                        </strong>
                      </div>
                      <div style={{ height: 6, background: "var(--line)", borderRadius: 0, overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(100, Math.round(metaConvRate || 0))}%`,
                            background: "var(--good, #1f6b43)",
                            borderRadius: 0,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--muted)", display: "block", marginTop: 4 }}>
                        Porcentaje de clics que derivaron en solicitud de contacto ({fmt.int(metaLeadsCount)} leads de {fmt.int(metaClicks)} clics).
                      </span>
                    </div>
                  </div>
                ) : (channelFilter === "google_lsa" || (channelFilter === "all" && hasLsa && !hasMeta)) ? (
                  /* 2. Modo exclusivo Google LSA */
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                      <div>
                        <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                          Impresiones Totales
                        </span>
                        <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>
                          {fmt.int(totalImpressions)}
                        </p>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>veces mostrado el anuncio</span>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                          Top Impression %
                        </span>
                        <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>
                          {avgTopImp != null ? `${Math.round(avgTopImp * 100)} %` : "—"}
                        </p>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>cuota sobre competidores</span>
                      </div>
                    </div>

                    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                          1ª Posición Absoluta (Abs. Top IS)
                        </span>
                        <strong style={{ fontSize: 13, color: "var(--accent)" }}>
                          {avgAbsTopImp != null ? `${Math.round(avgAbsTopImp * 100)} %` : "—"}
                        </strong>
                      </div>
                      <div style={{ height: 6, background: "var(--line)", borderRadius: 0, overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(100, Math.round((avgAbsTopImp || 0) * 100))}%`,
                            background: "var(--ink)",
                            borderRadius: 0,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--muted)", display: "block", marginTop: 4 }}>
                        Porcentaje de subastas donde tu ficha ocupó la primera plaza absoluta en Google.
                      </span>
                    </div>
                  </>
                ) : (
                  /* 3. Modo combinado: Cliente con ambos canales (ej. JG, Palma, Shalom) */
                  <div>
                    {/* Bloque Google LSA */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="dot dot-lsa" style={{ display: "inline-block" }} /> Google LSA (Visibilidad)
                        </span>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          {fmt.int(totalImpressions - metaImpressions)} impresiones
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div style={{ background: "var(--paper)", padding: "8px 10px", border: "1px solid var(--line)" }}>
                          <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Top IS %</span>
                          <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
                            {avgTopImp != null ? `${Math.round(avgTopImp * 100)} %` : "—"}
                          </p>
                        </div>
                        <div style={{ background: "var(--paper)", padding: "8px 10px", border: "1px solid var(--line)" }}>
                          <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>1ª Pos. Absoluta</span>
                          <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>
                            {avgAbsTopImp != null ? `${Math.round(avgAbsTopImp * 100)} %` : "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bloque Meta Ads */}
                    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="dot dot-meta" style={{ display: "inline-block" }} /> Meta Ads (Rendimiento CPC)
                        </span>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          {fmt.int(metaImpressions)} impresiones
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                        <div style={{ background: "var(--paper)", padding: "8px 10px", border: "1px solid var(--line)" }}>
                          <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Clics</span>
                          <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
                            {fmt.int(metaClicks)}
                          </p>
                        </div>
                        <div style={{ background: "var(--paper)", padding: "8px 10px", border: "1px solid var(--line)" }}>
                          <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>CPC</span>
                          <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
                            {metaCpc != null ? fmt.eur(metaCpc) : "—"}
                          </p>
                        </div>
                        <div style={{ background: "var(--paper)", padding: "8px 10px", border: "1px solid var(--line)" }}>
                          <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>CTR</span>
                          <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>
                            {metaCtr != null ? `${metaCtr.toFixed(2)} %` : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Card C: Ranking de Ubicaciones */}
            <Card
              title="Ranking de Ubicaciones"
              action={
                <span className="pc-muted">
                  {channelFilter === "all" ? "Todos los canales" : channelName(channelFilter)}
                </span>
              }
            >
              <div style={{ padding: "4px 0" }}>
                <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 10px" }}>
                  Localidades con mayor volumen de solicitudes en este período:
                </p>
                <LocationRankingBars items={topLocations} />
              </div>
            </Card>

            {/* Card D: Comparativa Conjunta Google LSA vs Meta Ads */}
            <Card
              title="Comparativa Google LSA vs Meta Ads"
              action={<span className="pc-muted">{activeRange.label}</span>}
            >
              {channelComparison.length === 0 ? (
                <Empty>No hay actividad registrada en este período.</Empty>
              ) : (
                <div className="pc-table-wrap">
                  <table className="pc-table tabular">
                    <thead>
                      <tr>
                        <th scope="col">Canal</th>
                        <th scope="col">Leads</th>
                        <th scope="col">Inversión</th>
                        <th scope="col">CPL</th>
                        <th scope="col">Impresiones</th>
                        <th scope="col">Clics / Tráfico</th>
                        <th scope="col">Cerrados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {channelComparison.map((c) => {
                        const isSelected = channelFilter === c.channel;
                        return (
                          <tr
                            key={c.channel}
                            style={isSelected ? { background: "var(--paper)", fontWeight: 600 } : undefined}
                          >
                            <th scope="row" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span
                                className={`dot ${c.channel === "meta_ads" ? "dot-meta" : "dot-lsa"}`}
                                style={{ display: "inline-block" }}
                              />
                              {channelName(c.channel)}
                              {isSelected && <span style={{ fontSize: 11, color: "var(--accent)" }}>(activo)</span>}
                            </th>
                            <td>{fmt.int(c.leads)}</td>
                            <td>{fmt.eur0(c.spend)}</td>
                            <td>{fmt.eur(c.cpl)}</td>
                            <td>{c.impressions > 0 ? fmt.int(c.impressions) : "—"}</td>
                            <td>
                              {c.channel === "meta_ads"
                                ? c.clicks > 0
                                  ? `${fmt.int(c.clicks)} (${fmt.eur(c.cpc)})`
                                  : "—"
                                : `${fmt.int(c.leads)} contactos`}
                            </td>
                            <td>{fmt.int(c.closed)}</td>
                          </tr>
                        );
                      })}
                      <tr className="pc-total">
                        <th scope="row">Total Combinado</th>
                        <td>{fmt.int(dateOnlyLeads.length)}</td>
                        <td>{fmt.eur0(dateOnlyRows.reduce((a, r) => a + (r.spend || 0), 0))}</td>
                        <td>
                          {fmt.eur(
                            dateOnlyLeads.length > 0
                              ? dateOnlyRows.reduce((a, r) => a + (r.spend || 0), 0) / dateOnlyLeads.length
                              : null
                          )}
                        </td>
                        <td>{fmt.int(dateOnlyRows.reduce((a, r) => a + (r.impressions || 0), 0))}</td>
                        <td>
                          {(() => {
                            const totalClicks = dateOnlyRows.reduce((a, r) => a + (r.clicks || 0), 0);
                            return totalClicks > 0 ? `${fmt.int(totalClicks)} clics` : "—";
                          })()}
                        </td>
                        <td>
                          {fmt.int(
                            dateOnlyLeads.filter(
                              (l) => l.status === "cerrado" || l.google_lead_status === "BOOKED" || l.qualification?.status === "venta"
                            ).length
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
