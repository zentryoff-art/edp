"use client";

import { useState, useMemo } from "react";
import type { Lead } from "@/lib/portal/types";

const HOT = "#e75623"; // Brand palette orange
const HOT_HOVER = "#f56333";
const REST = "#8F8B83"; // Neutral slate
const REST_HOVER = "#75726B";

const DAYS_ES = [
  { key: 1, label: "Lunes", short: "Lun" },
  { key: 2, label: "Martes", short: "Mar" },
  { key: 3, label: "Miércoles", short: "Mié" },
  { key: 4, label: "Jueves", short: "Jue" },
  { key: 5, label: "Viernes", short: "Vie" },
  { key: 6, label: "Sábado", short: "Sáb" },
  { key: 0, label: "Domingo", short: "Dom" },
];

// Horas principales de análisis comercial (8:00 a 22:00)
const DISPLAY_HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8 to 22

interface ActivityPeakChartProps {
  leads: Lead[];
  title?: string;
  subtitle?: string;
  activeAccountLabel?: string;
}

export function ActivityPeakChart({
  leads,
  title = "Horas y Días de Mayor Actividad",
  subtitle,
  activeAccountLabel,
}: ActivityPeakChartProps) {
  const [viewMode, setViewMode] = useState<"hours" | "days" | "heatmap">("hours");
  const [activeHour, setActiveHour] = useState<number | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number; total: number; hot: number } | null>(null);

  // Procesa todos los leads y extrae hora (Europe/Madrid) y día de la semana
  const stats = useMemo(() => {
    // 24 horas
    const hourData = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${String(h).padStart(2, "0")}:00`,
      total: 0,
      hot: 0,
      rest: 0,
    }));

    // 7 días (0=Dom, 1=Lun, ..., 6=Sáb)
    const dayData = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
      day: d,
      name: DAYS_ES.find((item) => item.key === d)?.label || "",
      short: DAYS_ES.find((item) => item.key === d)?.short || "",
      total: 0,
      hot: 0,
      rest: 0,
    }));

    // Matriz día x hora (7 x 24)
    const matrix: { total: number; hot: number }[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({ total: 0, hot: 0 }))
    );

    let totalValidTime = 0;
    let commercialTimeCount = 0; // 08:00 a 20:00

    for (const lead of leads) {
      const raw = lead.created_at || (lead as { lead_created_at?: string }).lead_created_at;
      if (!raw) continue;
      const dt = new Date(raw);
      if (isNaN(dt.getTime())) continue;

      // Hora local española (Europe/Madrid)
      const hourStr = dt.toLocaleTimeString("es-ES", {
        timeZone: "Europe/Madrid",
        hour: "2-digit",
        hour12: false,
      });
      const h = parseInt(hourStr, 10);
      const isMidnightOnly = dt.getUTCHours() === 0 && dt.getUTCMinutes() === 0 && dt.getUTCSeconds() === 0;

      // Día de la semana (según zona horaria)
      const dayIdx = dt.getDay();

      const isHot =
        (lead.score && lead.score >= 4) ||
        (lead.computed_signals?.internal_rating && lead.computed_signals.internal_rating >= 4) ||
        false;

      // Acumular día (siempre válido independientemente de la hora)
      dayData[dayIdx].total += 1;
      if (isHot) {
        dayData[dayIdx].hot += 1;
      } else {
        dayData[dayIdx].rest += 1;
      }

      // Si tiene hora explícita (no fallback a medianoche 00:00)
      if (!isMidnightOnly && !isNaN(h) && h >= 0 && h < 24) {
        totalValidTime += 1;
        hourData[h].total += 1;
        if (isHot) {
          hourData[h].hot += 1;
        } else {
          hourData[h].rest += 1;
        }

        matrix[dayIdx][h].total += 1;
        if (isHot) {
          matrix[dayIdx][h].hot += 1;
        }

        if (h >= 8 && h < 20) {
          commercialTimeCount += 1;
        }
      }
    }

    // Identificar hora pico
    let peakHour = 11;
    let maxHourTotal = 0;
    for (let h = 0; h < 24; h++) {
      if (hourData[h].total > maxHourTotal) {
        maxHourTotal = hourData[h].total;
        peakHour = h;
      }
    }

    // Identificar día pico
    let peakDay = 4; // Jueves default
    let maxDayTotal = 0;
    for (let d = 0; d < 7; d++) {
      if (dayData[d].total > maxDayTotal) {
        maxDayTotal = dayData[d].total;
        peakDay = d;
      }
    }

    // Valor máximo para normalizar escala del mapa de calor
    let maxCellVal = 1;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (matrix[d][h].total > maxCellVal) {
          maxCellVal = matrix[d][h].total;
        }
      }
    }

    return {
      hourData,
      dayData,
      matrix,
      peakHour,
      maxHourTotal,
      peakDay,
      maxDayTotal,
      maxCellVal,
      totalValidTime,
      commercialRatio: totalValidTime > 0 ? Math.round((commercialTimeCount / totalValidTime) * 100) : 0,
      totalLeads: leads.length,
    };
  }, [leads]);

  if (leads.length === 0) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted)" }}>
        No hay suficientes datos de actividad registrados para este filtro.
      </div>
    );
  }

  // Dimensiones SVG
  const svgW = 680;
  const svgH = 220;
  const pad = { top: 32, right: 16, bottom: 32, left: 58 };
  const innerW = svgW - pad.left - pad.right;
  const innerH = svgH - pad.top - pad.bottom;

  // Escala para horas (8:00 a 22:00)
  const displayHourData = stats.hourData.filter((d) => DISPLAY_HOURS.includes(d.hour));
  const maxHVal = Math.max(1, ...displayHourData.map((d) => d.total));
  const hourBand = innerW / displayHourData.length;
  const hourBarW = Math.max(14, hourBand * 0.65);

  // Escala para días (Lunes a Domingo ordenado)
  const sortedDays = DAYS_ES.map((item) => stats.dayData.find((d) => d.day === item.key)!);
  const maxDVal = Math.max(1, ...sortedDays.map((d) => d.total));
  const dayBand = innerW / sortedDays.length;
  const dayBarW = Math.max(32, dayBand * 0.55);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* ── Encabezado & Selector de Vista ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
          borderBottom: "1px solid var(--line, #e3dfd7)",
          paddingBottom: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--ink)" }}>
              {title}
            </h3>
            {activeAccountLabel && (
              <span
                style={{
                  background: "var(--paper)",
                  border: "1px solid var(--ink)",
                  padding: "2px 8px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--ink)",
                  borderRadius: 0,
                }}
              >
                📍 {activeAccountLabel}
              </span>
            )}
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--muted)" }}>
            {subtitle || "Análisis de picos de conversión y patrones de contacto horario"}
          </p>
        </div>

        {/* Botones de alternancia de vista */}
        <div style={{ display: "inline-flex", border: "1px solid var(--line, #e3dfd7)", borderRadius: 0 }}>
          <button
            type="button"
            onClick={() => setViewMode("hours")}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 700,
              border: "none",
              borderRadius: 0,
              cursor: "pointer",
              background: viewMode === "hours" ? "var(--ink)" : "var(--paper)",
              color: viewMode === "hours" ? "#fff" : "var(--ink)",
              transition: "all .15s",
            }}
          >
            ⏰ Por Horas (24h)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("days")}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 700,
              border: "none",
              borderLeft: "1px solid var(--line, #e3dfd7)",
              borderRadius: 0,
              cursor: "pointer",
              background: viewMode === "days" ? "var(--ink)" : "var(--paper)",
              color: viewMode === "days" ? "#fff" : "var(--ink)",
              transition: "all .15s",
            }}
          >
            📅 Por Día de Semana
          </button>
          <button
            type="button"
            onClick={() => setViewMode("heatmap")}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 700,
              border: "none",
              borderLeft: "1px solid var(--line, #e3dfd7)",
              borderRadius: 0,
              cursor: "pointer",
              background: viewMode === "heatmap" ? "var(--ink)" : "var(--paper)",
              color: viewMode === "heatmap" ? "#fff" : "var(--ink)",
              transition: "all .15s",
            }}
          >
            🔥 Mapa de Calor
          </button>
        </div>
      </div>

      {/* ── Franja de KPIs de Actividad ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "10px",
          background: "var(--paper)",
          border: "1px solid var(--line)",
          padding: "10px 14px",
          borderRadius: 0,
        }}
      >
        <div>
          <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
            ⚡ Hora Punta
          </span>
          <p style={{ margin: "2px 0 0", fontSize: "17px", fontWeight: 800, color: HOT }}>
            {stats.peakHour}:00 h
            <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted)", marginLeft: "4px" }}>
              ({stats.maxHourTotal} leads)
            </span>
          </p>
        </div>

        <div>
          <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
            📅 Día con Mayor Volumen
          </span>
          <p style={{ margin: "2px 0 0", fontSize: "17px", fontWeight: 800, color: "var(--ink)" }}>
            {DAYS_ES.find((d) => d.key === stats.peakDay)?.label || "—"}
            <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted)", marginLeft: "4px" }}>
              ({stats.maxDayTotal} leads)
            </span>
          </p>
        </div>

        <div>
          <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
            🏢 Horario Laboral (8-20h)
          </span>
          <p style={{ margin: "2px 0 0", fontSize: "17px", fontWeight: 800, color: "var(--ink)" }}>
            {stats.commercialRatio}%
            <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted)", marginLeft: "4px" }}>
              del volumen
            </span>
          </p>
        </div>

        <div>
          <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
            🎯 Franja Óptima
          </span>
          <p style={{ margin: "2px 0 0", fontSize: "17px", fontWeight: 800, color: "var(--good, #1f6b43)" }}>
            10:00 – 15:00 h
          </p>
        </div>
      </div>

      {/* ── Leyenda Brutalista ── */}
      <div style={{ display: "flex", gap: "16px", alignItems: "center", fontSize: "12px", color: "var(--muted)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: 12, height: 12, background: HOT, display: "inline-block", borderRadius: 0 }} />
          <strong style={{ color: "var(--ink)" }}>Leads Nota 4–5 (Alto Valor)</strong>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: 12, height: 12, background: REST, display: "inline-block", borderRadius: 0 }} />
          <span>Leads Nota 1–3</span>
        </span>
        {viewMode === "heatmap" && (
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>Baja</span>
            <span style={{ width: 14, height: 10, background: "rgba(231, 86, 35, 0.15)", borderRadius: 0 }} />
            <span style={{ width: 14, height: 10, background: "rgba(231, 86, 35, 0.45)", borderRadius: 0 }} />
            <span style={{ width: 14, height: 10, background: HOT, borderRadius: 0 }} />
            <span>Alta intensidad</span>
          </span>
        )}
      </div>

      {/* ── VISTA 1: POR HORAS DEL DÍA ── */}
      {viewMode === "hours" && (
        <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            preserveAspectRatio="none"
            style={{ width: "100%", height: "230px", display: "block" }}
            aria-label="Distribución de leads por hora del día"
          >
            {/* Título de eje vertical */}
            <text
              x={pad.left}
              y={pad.top - 12}
              textAnchor="start"
              style={{ fontSize: 10, fill: "var(--muted)", fontWeight: 700, letterSpacing: "0.03em" }}
            >
              Nº DE LEADS / HORA
            </text>

            {/* Líneas guía horizontales */}
            {[0, 0.5, 1].map((ratio) => {
              const val = Math.round(maxHVal * (1 - ratio));
              const yPos = pad.top + innerH * ratio;
              return (
                <g key={ratio}>
                  <line
                    x1={pad.left}
                    x2={svgW - pad.right}
                    y1={yPos}
                    y2={yPos}
                    stroke="var(--line, #e3dfd7)"
                    strokeDasharray={ratio === 1 ? undefined : "3 3"}
                    strokeWidth={1}
                  />
                  <text
                    x={pad.left - 6}
                    y={yPos + 4}
                    textAnchor="end"
                    style={{ fontSize: 10, fill: "var(--muted)", fontVariantNumeric: "tabular-nums" }}
                  >
                    {ratio === 0 ? `${val} leads` : val}
                  </text>
                </g>
              );
            })}

            {/* Barras de cada hora */}
            {displayHourData.map((d, i) => {
              const xCenter = pad.left + hourBand * i + hourBand / 2;
              const xLeft = xCenter - hourBarW / 2;

              const totalH = (d.total / maxHVal) * innerH;
              const hotH = (d.hot / maxHVal) * innerH;
              const restH = (d.rest / maxHVal) * innerH;
              const isPeak = d.hour === stats.peakHour && d.total > 0;
              const isHover = activeHour === d.hour;

              return (
                <g
                  key={d.hour}
                  opacity={activeHour != null && !isHover ? 0.4 : 1}
                  style={{ transition: "opacity .15s", cursor: "pointer" }}
                  onMouseEnter={() => setActiveHour(d.hour)}
                  onMouseLeave={() => setActiveHour(null)}
                >
                  {/* Fondo sutil hover / columna */}
                  {isHover && (
                    <rect
                      x={pad.left + hourBand * i}
                      y={pad.top}
                      width={hourBand}
                      height={innerH}
                      fill="rgba(231, 86, 35, 0.05)"
                    />
                  )}

                  {/* Indicador Pico de Hora */}
                  {isPeak && (
                    <g>
                      <rect
                        x={xCenter - 18}
                        y={pad.top + innerH - totalH - 22}
                        width={36}
                        height={16}
                        fill={HOT}
                      />
                      <text
                        x={xCenter}
                        y={pad.top + innerH - totalH - 10}
                        textAnchor="middle"
                        style={{ fontSize: 9, fill: "#fff", fontWeight: 800 }}
                      >
                        PICO
                      </text>
                    </g>
                  )}

                  {/* Barra Hot (Nota 4-5) */}
                  {d.hot > 0 && (
                    <rect
                      x={xLeft}
                      y={pad.top + innerH - hotH}
                      width={hourBarW}
                      height={hotH}
                      fill={isHover ? HOT_HOVER : HOT}
                    />
                  )}

                  {/* Barra Rest (Nota 1-3) apilada */}
                  {d.rest > 0 && (
                    <rect
                      x={xLeft}
                      y={pad.top + innerH - hotH - restH}
                      width={hourBarW}
                      height={restH}
                      fill={isHover ? REST_HOVER : REST}
                    />
                  )}

                  {/* Etiqueta Eje X */}
                  <text
                    x={xCenter}
                    y={svgH - 12}
                    textAnchor="middle"
                    style={{
                      fontSize: 10,
                      fontWeight: isPeak || isHover ? 800 : 500,
                      fill: isPeak ? HOT : isHover ? "var(--ink)" : "var(--muted)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {d.hour}h
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Tooltip flotante interactivo para horas */}
          {activeHour != null && (() => {
            const hObj = stats.hourData.find((h) => h.hour === activeHour);
            if (!hObj) return null;
            const pct = stats.totalValidTime > 0 ? Math.round((hObj.total / stats.totalValidTime) * 100) : 0;
            return (
              <div
                className="pc-tip tabular"
                style={{
                  position: "absolute",
                  top: 10,
                  right: 14,
                  background: "var(--ink)",
                  color: "#fff",
                  padding: "8px 12px",
                  fontSize: "12px",
                  borderRadius: 0,
                  border: "1px solid var(--ink)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                <strong style={{ display: "block", marginBottom: 4, color: "#fff" }}>
                  Franja: {hObj.hour}:00 - {hObj.hour}:59 h
                </strong>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ color: "#fff" }}>
                    Total leads: <b>{hObj.total}</b> ({pct}% del total)
                  </span>
                  <span style={{ color: HOT }}>
                    Nota 4–5: <b>{hObj.hot}</b>
                  </span>
                  <span style={{ color: "#c8c5be" }}>
                    Nota 1–3: <b>{hObj.rest}</b>
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── VISTA 2: POR DÍA DE SEMANA ── */}
      {viewMode === "days" && (
        <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            preserveAspectRatio="none"
            style={{ width: "100%", height: "230px", display: "block" }}
            aria-label="Distribución de leads por día de la semana"
          >
            {/* Título de eje vertical */}
            <text
              x={pad.left}
              y={pad.top - 12}
              textAnchor="start"
              style={{ fontSize: 10, fill: "var(--muted)", fontWeight: 700, letterSpacing: "0.03em" }}
            >
              Nº DE LEADS / DÍA
            </text>

            {/* Líneas guía horizontales */}
            {[0, 0.5, 1].map((ratio) => {
              const val = Math.round(maxDVal * (1 - ratio));
              const yPos = pad.top + innerH * ratio;
              return (
                <g key={ratio}>
                  <line
                    x1={pad.left}
                    x2={svgW - pad.right}
                    y1={yPos}
                    y2={yPos}
                    stroke="var(--line, #e3dfd7)"
                    strokeDasharray={ratio === 1 ? undefined : "3 3"}
                    strokeWidth={1}
                  />
                  <text
                    x={pad.left - 6}
                    y={yPos + 4}
                    textAnchor="end"
                    style={{ fontSize: 10, fill: "var(--muted)", fontVariantNumeric: "tabular-nums" }}
                  >
                    {ratio === 0 ? `${val} leads` : val}
                  </text>
                </g>
              );
            })}

            {/* Barras por día */}
            {sortedDays.map((d, i) => {
              const xCenter = pad.left + dayBand * i + dayBand / 2;
              const xLeft = xCenter - dayBarW / 2;

              const totalH = (d.total / maxDVal) * innerH;
              const hotH = (d.hot / maxDVal) * innerH;
              const restH = (d.rest / maxDVal) * innerH;
              const isPeak = d.day === stats.peakDay && d.total > 0;
              const isHover = activeDay === d.day;

              return (
                <g
                  key={d.day}
                  opacity={activeDay != null && !isHover ? 0.4 : 1}
                  style={{ transition: "opacity .15s", cursor: "pointer" }}
                  onMouseEnter={() => setActiveDay(d.day)}
                  onMouseLeave={() => setActiveDay(null)}
                >
                  {/* Fondo sutil hover */}
                  {isHover && (
                    <rect
                      x={pad.left + dayBand * i}
                      y={pad.top}
                      width={dayBand}
                      height={innerH}
                      fill="rgba(231, 86, 35, 0.05)"
                    />
                  )}

                  {/* Indicador Pico de Día */}
                  {isPeak && (
                    <g>
                      <rect
                        x={xCenter - 28}
                        y={pad.top + innerH - totalH - 22}
                        width={56}
                        height={16}
                        fill={HOT}
                      />
                      <text
                        x={xCenter}
                        y={pad.top + innerH - totalH - 10}
                        textAnchor="middle"
                        style={{ fontSize: 9, fill: "#fff", fontWeight: 800 }}
                      >
                        MÁXIMO
                      </text>
                    </g>
                  )}

                  {/* Barra Hot */}
                  {d.hot > 0 && (
                    <rect
                      x={xLeft}
                      y={pad.top + innerH - hotH}
                      width={dayBarW}
                      height={hotH}
                      fill={isHover ? HOT_HOVER : HOT}
                    />
                  )}

                  {/* Barra Rest */}
                  {d.rest > 0 && (
                    <rect
                      x={xLeft}
                      y={pad.top + innerH - hotH - restH}
                      width={dayBarW}
                      height={restH}
                      fill={isHover ? REST_HOVER : REST}
                    />
                  )}

                  {/* Etiqueta Eje X */}
                  <text
                    x={xCenter}
                    y={svgH - 12}
                    textAnchor="middle"
                    style={{
                      fontSize: 11,
                      fontWeight: isPeak || isHover ? 800 : 600,
                      fill: isPeak ? HOT : isHover ? "var(--ink)" : "var(--muted)",
                    }}
                  >
                    {d.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Tooltip flotante para días */}
          {activeDay != null && (() => {
            const dObj = stats.dayData.find((d) => d.day === activeDay);
            if (!dObj) return null;
            const pct = stats.totalLeads > 0 ? Math.round((dObj.total / stats.totalLeads) * 100) : 0;
            return (
              <div
                className="pc-tip tabular"
                style={{
                  position: "absolute",
                  top: 10,
                  right: 14,
                  background: "var(--ink)",
                  color: "#fff",
                  padding: "8px 12px",
                  fontSize: "12px",
                  borderRadius: 0,
                  border: "1px solid var(--ink)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                <strong style={{ display: "block", marginBottom: 4, color: "#fff" }}>
                  {dObj.name}
                </strong>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ color: "#fff" }}>
                    Total leads: <b>{dObj.total}</b> ({pct}% del volumen semanal)
                  </span>
                  <span style={{ color: HOT }}>
                    Nota 4–5: <b>{dObj.hot}</b>
                  </span>
                  <span style={{ color: "#c8c5be" }}>
                    Nota 1–3: <b>{dObj.rest}</b>
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── VISTA 3: MAPA DE CALOR (DÍA × HORA) ── */}
      {viewMode === "heatmap" && (
        <div style={{ width: "100%", overflowX: "auto" }}>
          <div style={{ minWidth: "580px" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "11px",
                textAlign: "center",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      color: "var(--muted)",
                      fontWeight: 700,
                      borderBottom: "1px solid var(--line)",
                      width: "80px",
                    }}
                  >
                    Día / Hora
                  </th>
                  {DISPLAY_HOURS.map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "6px 2px",
                        color: h === stats.peakHour ? HOT : "var(--muted)",
                        fontWeight: h === stats.peakHour ? 800 : 600,
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      {h}h
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS_ES.map((item) => {
                  const dayIdx = item.key;
                  return (
                    <tr key={dayIdx}>
                      <td
                        style={{
                          textAlign: "left",
                          padding: "6px 8px",
                          fontWeight: dayIdx === stats.peakDay ? 800 : 600,
                          color: dayIdx === stats.peakDay ? HOT : "var(--ink)",
                          borderBottom: "1px solid var(--line)",
                          background: "var(--paper)",
                        }}
                      >
                        {item.short}
                      </td>
                      {DISPLAY_HOURS.map((h) => {
                        const cell = stats.matrix[dayIdx][h];
                        const total = cell.total;
                        const hot = cell.hot;
                        const isPeak = total > 0 && total === stats.maxCellVal;

                        // Gradiente de color brutalist
                        let bg = "transparent";
                        let color = "var(--muted)";
                        if (total > 0) {
                          const intensity = Math.min(1, total / Math.max(1, stats.maxCellVal));
                          if (intensity > 0.6) {
                            bg = HOT;
                            color = "#fff";
                          } else if (intensity > 0.3) {
                            bg = "rgba(231, 86, 35, 0.45)";
                            color = "var(--ink)";
                          } else {
                            bg = "rgba(231, 86, 35, 0.18)";
                            color = "var(--ink)";
                          }
                        }

                        return (
                          <td
                            key={h}
                            onMouseEnter={() => setHoveredCell({ day: dayIdx, hour: h, total, hot })}
                            onMouseLeave={() => setHoveredCell(null)}
                            style={{
                              padding: "6px 2px",
                              border: "1px solid var(--line)",
                              background: bg,
                              color: color,
                              fontWeight: total > 0 ? 700 : 400,
                              cursor: total > 0 ? "pointer" : "default",
                              transition: "all .1s",
                            }}
                            title={`${item.label} ${h}:00h: ${total} solicitudes (${hot} Nota 4-5)`}
                          >
                            {total > 0 ? total : "·"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Sub-indicador del hovered cell */}
            <div style={{ marginTop: "8px", minHeight: "22px", fontSize: "12px", color: "var(--ink)" }}>
              {hoveredCell && hoveredCell.total > 0 ? (
                <span>
                  📍 <strong>{DAYS_ES.find((d) => d.key === hoveredCell.day)?.label} a las {hoveredCell.hour}:00 h</strong>:{" "}
                  <b>{hoveredCell.total} solicitudes</b> ({hoveredCell.hot} de alta calidad Nota 4–5)
                </span>
              ) : (
                <span style={{ color: "var(--muted)" }}>
                  Pasa el cursor sobre cualquier casilla para inspeccionar la actividad por día y hora.
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
