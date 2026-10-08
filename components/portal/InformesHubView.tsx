"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { DailyMetric, Lead, Report } from "@/lib/portal/types";
import { fmt, cap, channelName, isoDay } from "@/lib/portal/metrics";
import { Card, Empty, PageHead, LocationRankingBars, RatioBar } from "@/components/portal/ui";

interface InformesHubViewProps {
  reports: Report[];
  rows: DailyMetric[];
  leads: Lead[];
  clientName: string;
}

type TabType = "mensuales" | "semanales" | "fechas";
type ChannelFilter = "all" | "google_lsa" | "meta_ads";

export function InformesHubView({
  reports,
  rows,
  leads,
  clientName,
}: InformesHubViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("mensuales");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => isoDay(today), [today]);

  // Rango para la pestaña de "Consultar por Fecha"
  const [customFrom, setCustomFrom] = useState("2026-10-01");
  const [customTo, setCustomTo] = useState(todayIso);

  // Filtrado base por canal
  const channelFilteredRows = useMemo(() => {
    return channelFilter === "all" ? rows : rows.filter((r) => r.channel === channelFilter);
  }, [rows, channelFilter]);

  const channelFilteredLeads = useMemo(() => {
    return channelFilter === "all" ? leads : leads.filter((l) => l.channel === channelFilter);
  }, [leads, channelFilter]);

  // ── 1. Datos para el Mes Actual Dinámico ──
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

  const currentMonthPeriodId = useMemo(() => {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  }, [today]);

  // Regla de disponibilidad del PDF: 5 del siguiente mes a las 23:59:59
  const pdfReleaseDate = useMemo(() => {
    const nextMonthYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
    const nextMonthIndex = today.getMonth() === 11 ? 0 : today.getMonth() + 1;
    return new Date(nextMonthYear, nextMonthIndex, 5, 23, 59, 59);
  }, [today]);

  const nextMonthName = useMemo(() => {
    const nextDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return nextDate.toLocaleString("es-ES", { month: "long" });
  }, [today]);

  const isMonthPdfReady = useMemo(() => {
    return today.getTime() >= pdfReleaseDate.getTime();
  }, [today, pdfReleaseDate]);

  const octRows = useMemo(() => channelFilteredRows.filter((r) => r.date >= currentMonthStart && r.date <= currentMonthEnd), [channelFilteredRows, currentMonthStart, currentMonthEnd]);
  const octLeads = useMemo(() => channelFilteredLeads.filter((l) => (l.created_at || "").slice(0, 10) >= currentMonthStart), [channelFilteredLeads, currentMonthStart]);

  const octSpend = useMemo(() => octRows.reduce((a, r) => a + (r.spend || 0), 0), [octRows]);
  const octImpressions = useMemo(() => octRows.reduce((a, r) => a + (r.impressions || 0), 0), [octRows]);
  const octLeadsCount = octLeads.length;
  const octCpl = octLeadsCount > 0 ? octSpend / octLeadsCount : null;
  const octClosed = useMemo(() => {
    return octLeads.filter(
      (l) => l.status === "cerrado" || l.google_lead_status === "BOOKED" || l.qualification?.status === "venta"
    ).length;
  }, [octLeads]);

  // ── 2. Datos para Informes Semanales ──
  const weeklyPeriods = useMemo(() => {
    const list = [
      {
        id: "2026-W41",
        label: "Semana 41 (05 oct - 11 oct 2026)",
        start: "2026-10-05",
        end: "2026-10-11",
        isCurrent: true,
      },
      {
        id: "2026-W40",
        label: "Semana 40 (28 sep - 04 oct 2026)",
        start: "2026-09-28",
        end: "2026-10-04",
        isCurrent: false,
      },
    ];

    return list.map((w) => {
      const wRows = channelFilteredRows.filter((r) => r.date >= w.start && r.date <= w.end);
      const wLeads = channelFilteredLeads.filter((l) => {
        const d = (l.created_at || "").slice(0, 10);
        return d >= w.start && d <= w.end;
      });
      const wSpend = wRows.reduce((a, r) => a + (r.spend || 0), 0);
      const wImpressions = wRows.reduce((a, r) => a + (r.impressions || 0), 0);
      const wCount = wLeads.length;
      const wCpl = wCount > 0 ? wSpend / wCount : null;
      const wCalls = wLeads.filter((l) => l.lead_type === "phone_call" || (l.channel === "google_lsa" && !l.message)).length;
      const wMsgs = wLeads.filter((l) => l.lead_type === "message" || Boolean(l.message) || l.channel === "meta_ads").length;

      return {
        ...w,
        spend: wSpend,
        impressions: wImpressions,
        leadsCount: wCount,
        cpl: wCpl,
        calls: wCalls,
        msgs: wMsgs,
        leads: wLeads,
        rows: wRows,
      };
    });
  }, [channelFilteredRows, channelFilteredLeads]);

  // ── 3. Datos para "Consultar por Fecha" ──
  const customRows = useMemo(() => channelFilteredRows.filter((r) => r.date >= customFrom && r.date <= customTo), [channelFilteredRows, customFrom, customTo]);
  const customLeads = useMemo(() => {
    return channelFilteredLeads.filter((l) => {
      const d = (l.created_at || "").slice(0, 10);
      return d >= customFrom && d <= customTo;
    });
  }, [channelFilteredLeads, customFrom, customTo]);

  const customSpend = useMemo(() => customRows.reduce((a, r) => a + (r.spend || 0), 0), [customRows]);
  const customImpressions = useMemo(() => customRows.reduce((a, r) => a + (r.impressions || 0), 0), [customRows]);
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
      </div>

      {/* ── TAB 1: INFORMES MENSUALES ── */}
      {activeTab === "mensuales" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <Card title="Informe Mensual en Curso">
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
                    {currentMonthName} {today.getFullYear()} {channelFilter !== "all" && `(${channelName(channelFilter)})`}
                  </h3>
                  <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                    Período en curso auditado (01 {currentMonthName.toLowerCase()} {today.getFullYear()} - hoy)
                  </span>
                </div>

                <div>
                  {isMonthPdfReady ? (
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
                      ✅ Consolidado
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
                      ⏳ En curso · Conciliación de cierres
                    </span>
                  )}
                </div>
              </div>

              {/* KPIs rápidos del mes */}
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
                    {fmt.int(octLeadsCount)}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Inversión
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>
                    {fmt.eur0(octSpend)}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    CPL Medio
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>
                    {fmt.eur(octCpl)}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Impresiones
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>
                    {fmt.int(octImpressions)}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Ventas cerradas
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--good, #1f6b43)" }}>
                    {fmt.int(octClosed)}
                  </p>
                </div>
              </div>

              {/* Aviso regla del día 5 */}
              <div
                style={{
                  background: isMonthPdfReady ? "#edf7f0" : "#fff8e6",
                  border: `1px solid ${isMonthPdfReady ? "#c3e6cb" : "#ffe8a3"}`,
                  borderRadius: 0,
                  padding: "12px 16px",
                  marginBottom: "20px",
                  fontSize: "13px",
                  color: isMonthPdfReady ? "var(--good, #1f6b43)" : "#8f6000",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span>{isMonthPdfReady ? "📄" : "⏳"}</span>
                <div>
                  {isMonthPdfReady ? (
                    <span>El informe mensual de {currentMonthName} está cerrado y listo para su descarga ejecutiva en PDF.</span>
                  ) : (
                    <span>
                      <strong>Descarga en PDF programada:</strong> Disponible a partir del{" "}
                      <strong>5 de {nextMonthName} de {pdfReleaseDate.getFullYear()}</strong>. Los informes mensuales se consolidan tras el día 5 del siguiente
                      mes para dar tiempo a la conciliación definitiva de cierres, importes e incidencias con el cliente.
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <Link href={`/clientes/informes/${currentMonthPeriodId}`} className="btn btn-ink" style={{ padding: "8px 16px", fontSize: "13px" }}>
                  Ver informe interactivo completo →
                </Link>
                {isMonthPdfReady && (
                  <button type="button" className="btn btn-outline" style={{ padding: "8px 16px", fontSize: "13px" }}>
                    📥 Descargar PDF
                  </button>
                )}
              </div>
            </div>
          </Card>

          {/* Si existieran otros informes históricos en la colección */}
          {reports.filter((r) => r.period !== "2026-10-01").length > 0 && (
            <Card title="Historial de Informes Anteriores">
              <ul className="pc-reports">
                {reports
                  .filter((r) => r.period !== "2026-10-01")
                  .map((r) => (
                    <li key={r.id}>
                      <Link href={`/clientes/informes/${r.period.slice(0, 7)}`} className="pc-report-row">
                        <span className="pc-report-month">
                          <strong>{cap(fmt.month(r.period))}</strong>
                          {r.title && <span className="pc-muted">{r.title}</span>}
                        </span>
                        <span className="pc-arrow" aria-hidden>
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
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
                        Impresiones Google
                      </span>
                      <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>
                        {fmt.int(customImpressions)}
                      </p>
                    </div>
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
                        Ranking de Ubicaciones en este intervalo
                      </h4>
                      <LocationRankingBars items={customLocations} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
