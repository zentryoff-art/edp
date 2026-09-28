"use client";

import { useEffect, useRef, useState } from "react";

export type ChartPoint = { label: string; sub: string; hot: number; rest: number; spend: number };

const H = 240;
const M = { top: 12, right: 8, bottom: 28, left: 40 };
const INK = "#16140F";
const REST = "#8F8B83";
const GRID = "#ECEAE6";

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const int = new Intl.NumberFormat("es-ES");

/** Máximo "redondo" cuyo cuarto también es entero (marcas 0, ¼, ½, ¾, 1 sin decimales). */
function niceMax(v: number) {
  for (const m of [4, 8, 12, 20]) if (v <= m) return m;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** Barra con esquinas superiores redondeadas (4px) y base recta. */
function topRounded(x: number, y: number, w: number, h: number, r = 4) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

export function LeadsChart({ points, title, caption }: { points: ChartPoint[]; title: string; caption?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerW = w - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const max = niceMax(Math.max(1, ...points.map((p) => p.hot + p.rest)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f * 10) / 10);
  const band = innerW / Math.max(1, points.length);
  const barW = Math.min(24, band * 0.62);
  const y = (v: number) => M.top + innerH - (v / max) * innerH;
  const every = Math.max(1, Math.ceil(points.length / Math.floor(innerW / 56)));
  const totalHot = points.reduce((a, p) => a + p.hot, 0);
  const totalRest = points.reduce((a, p) => a + p.rest, 0);

  const tip = active != null ? points[active] : null;
  const tipX = active != null ? M.left + band * active + band / 2 : 0;

  return (
    <figure className="pc-chart">
      <figcaption className="pc-chart-head">
        <div>
          <h2 className="pc-h2">{title}</h2>
          {caption && <p className="pc-muted">{caption}</p>}
        </div>
        <div className="pc-chart-tools">
          <ul className="pc-legend" aria-label="Leyenda">
            <li>
              <i style={{ background: INK }} /> Nota 4–5 <strong className="tabular">{int.format(totalHot)}</strong>
            </li>
            <li>
              <i style={{ background: REST }} /> Nota 1–3 <strong className="tabular">{int.format(totalRest)}</strong>
            </li>
          </ul>
          <button type="button" className="pc-link" onClick={() => setTable((t) => !t)} aria-pressed={table}>
            {table ? "Ver gráfico" : "Ver tabla"}
          </button>
        </div>
      </figcaption>

      {table ? (
        <div className="pc-table-wrap">
          <table className="pc-table tabular">
            <thead>
              <tr>
                <th scope="col">Periodo</th>
                <th scope="col">Nota 4–5</th>
                <th scope="col">Nota 1–3</th>
                <th scope="col">Total</th>
                <th scope="col">Gasto</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.label + p.sub}>
                  <th scope="row">{p.sub}</th>
                  <td>{int.format(p.hot)}</td>
                  <td>{int.format(p.rest)}</td>
                  <td>{int.format(p.hot + p.rest)}</td>
                  <td>{eur.format(p.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="pc-plot" ref={wrap} onMouseLeave={() => setActive(null)}>
          <svg width={w} height={H} role="img" aria-label={`${title}. ${int.format(totalHot)} leads de nota 4–5 y ${int.format(totalRest)} de nota 1–3.`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={w - M.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
                <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="pc-axis">
                  {int.format(t)}
                </text>
              </g>
            ))}
            {points.map((p, i) => {
              const x = M.left + band * i + (band - barW) / 2;
              const hotTop = y(p.hot);
              const hotH = y(0) - hotTop;
              const restH = (p.rest / max) * innerH;
              const gap = p.hot > 0 && p.rest > 0 ? 2 : 0;
              const dim = active != null && active !== i;
              return (
                <g key={i} opacity={dim ? 0.4 : 1} style={{ transition: "opacity .15s" }}>
                  {p.hot > 0 && (p.rest > 0 ? <rect x={x} y={hotTop} width={barW} height={hotH} fill={INK} /> : <path d={topRounded(x, hotTop, barW, hotH)} fill={INK} />)}
                  {p.rest > 0 && <path d={topRounded(x, hotTop - gap - restH, barW, restH)} fill={REST} />}
                  {i % every === 0 && (
                    <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="pc-axis">
                      {p.label}
                    </text>
                  )}
                  <rect
                    x={M.left + band * i}
                    y={M.top}
                    width={band}
                    height={innerH}
                    fill="transparent"
                    tabIndex={0}
                    role="button"
                    aria-label={`${p.sub}: ${p.hot} de nota 4–5, ${p.rest} de nota 1–3, gasto ${eur.format(p.spend)}`}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    className="pc-hit"
                  />
                </g>
              );
            })}
            <line x1={M.left} x2={w - M.right} y1={y(0)} y2={y(0)} stroke="#CFCCC6" strokeWidth={1} />
          </svg>
          {tip && (
            <div
              className="pc-tip tabular"
              style={{ left: Math.min(Math.max(tipX, 90), w - 90), top: Math.max(0, y(tip.hot + tip.rest) - 12) }}
              role="status"
            >
              <strong>{tip.sub}</strong>
              <span>
                <i style={{ background: INK }} /> Nota 4–5 <b>{int.format(tip.hot)}</b>
              </span>
              <span>
                <i style={{ background: REST }} /> Nota 1–3 <b>{int.format(tip.rest)}</b>
              </span>
              <span className="pc-tip-sep">
                Total <b>{int.format(tip.hot + tip.rest)}</b>
              </span>
              <span>
                Gasto <b>{eur.format(tip.spend)}</b>
              </span>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
