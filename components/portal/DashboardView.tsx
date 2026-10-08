"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { DailyMetric, Lead, PortalBooking, Incident, Report } from "@/lib/portal/types";
import { fmt, isoDay, channelName, weekly } from "@/lib/portal/metrics";
import { LeadsChart } from "@/components/portal/LeadsChart";
import { Card, Empty, PageHead, StatTile, LocationRankingBars, RatioBar } from "@/components/portal/ui";

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

type FilterPreset = "octubre" | "esta_semana" | "ultimos_7" | "hoy" | "custom";
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

  // Fechas clave
  const octStart = "2026-10-01";
  
  // Lunes de la semana actual
  const startOfWeekIso = useMemo(() => {
    const t = new Date(today.getTime());
    const dayOfWeek = t.getDay() === 0 ? 6 : t.getDay() - 1; // Lunes = 0
    t.setDate(t.getDate() - dayOfWeek);
    return isoDay(t);
  }, [today]);

  // Hace 7 días
  const sevenDaysAgoIso = useMemo(() => {
    const t = new Date(today.getTime() - 6 * 86400000);
    return isoDay(t);
  }, [today]);

  // Estado de los filtros: Fechas y Canal
  const [preset, setPreset] = useState<FilterPreset>("octubre");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [customFrom, setCustomFrom] = useState<string>(octStart);
  const [customTo, setCustomTo] = useState<string>(todayIso);

  // Rango activo
  const activeRange = useMemo(() => {
    switch (preset) {
      case "octubre":
        return { from: octStart, to: "2026-10-31", label: "Octubre 2026 (Mes en curso)" };
      case "esta_semana":
        return { from: startOfWeekIso, to: todayIso, label: `Esta semana (${fmt.day(startOfWeekIso)} - ${fmt.day(todayIso)})` };
      case "ultimos_7":
        return { from: sevenDaysAgoIso, to: todayIso, label: `Últimos 7 días (${fmt.day(sevenDaysAgoIso)} - ${fmt.day(todayIso)})` };
      case "hoy":
        return { from: todayIso, to: todayIso, label: `Hoy (${fmt.day(todayIso)})` };
      case "custom":
        return { from: customFrom, to: customTo, label: `Personalizado (${customFrom} a ${customTo})` };
    }
  }, [preset, startOfWeekIso, sevenDaysAgoIso, todayIso, customFrom, customTo]);

  // Filtrado reactivo de métricas y leads (por fecha Y canal)
  const filteredRows = useMemo(() => {
    return initialRows.filter((r) => {
      const matchDate = r.date >= activeRange.from && r.date <= activeRange.to;
      const matchChannel = channelFilter === "all" || r.channel === channelFilter;
      return matchDate && matchChannel;
    });
  }, [initialRows, activeRange, channelFilter]);

  const filteredLeads = useMemo(() => {
    return initialLeads.filter((l) => {
      const d = (l.created_at || "").slice(0, 10);
      const matchDate = d >= activeRange.from && d <= activeRange.to;
      const matchChannel = channelFilter === "all" || l.channel === channelFilter;
      return matchDate && matchChannel;
    });
  }, [initialLeads, activeRange, channelFilter]);

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

  // Rendimiento de Anuncios Google
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
      const chClosed = chLeads.filter(
        (l) => l.status === "cerrado" || l.google_lead_status === "BOOKED" || l.qualification?.status === "venta"
      ).length;
      return {
        channel,
        leads: chLeads.length,
        spend: chSpend,
        cpl: chLeads.length > 0 ? chSpend / chLeads.length : null,
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
              onClick={() => setChannelFilter("all")}
            >
              Todos los Canales
            </button>
            <button
              type="button"
              className={`pc-date-pill ${channelFilter === "google_lsa" ? "is-active" : ""}`}
              onClick={() => setChannelFilter("google_lsa")}
            >
              <span className="dot dot-lsa" style={{ display: "inline-block", marginRight: "4px" }} />
              Google LSA
            </button>
            <button
              type="button"
              className={`pc-date-pill ${channelFilter === "meta_ads" ? "is-active" : ""}`}
              onClick={() => setChannelFilter("meta_ads")}
            >
              <span className="dot dot-meta" style={{ display: "inline-block", marginRight: "4px" }} />
              Meta Ads
            </button>
          </div>
        </div>

        {/* Fila 2: Filtro de Fecha */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", borderTop: "1px dashed var(--line, #e3dfd7)", paddingTop: "10px" }}>
          <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, minWidth: "55px" }}>
            Fecha:
          </span>
          <div className="pc-date-presets">
            <button
              type="button"
              className={`pc-date-pill ${preset === "octubre" ? "is-active" : ""}`}
              onClick={() => setPreset("octubre")}
            >
              📁 Octubre 2026
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
              className={`pc-date-pill ${preset === "ultimos_7" ? "is-active" : ""}`}
              onClick={() => setPreset("ultimos_7")}
            >
              ⚡ Últimos 7 Días
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
              vs={preset === "octubre" ? "Octubre" : "rango seleccionado"}
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

            {/* Card B: Rendimiento del Anuncio (Google Ads API) */}
            <Card
              title="Rendimiento del Anuncio"
              action={
                <span className="pc-muted">
                  {channelFilter === "meta_ads" ? "Meta Ads" : "Google Ads API"}
                </span>
              }
            >
              <div style={{ padding: "6px 0" }}>
                {channelFilter === "meta_ads" ? (
                  <div>
                    <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>
                      En Meta Ads el seguimiento de impresiones y alcance se procesa conjuntamente en las métricas de campaña.
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div>
                        <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                          Leads Meta Recibidos
                        </span>
                        <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>
                          {fmt.int(leadsCount)}
                        </p>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                          Inversión Meta Ads
                        </span>
                        <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>
                          {fmt.eur0(spend)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
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
