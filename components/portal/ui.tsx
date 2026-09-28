import type { ReactNode } from "react";
import { Scale } from "@/components/Scale";
import type { IncidentStatus } from "@/lib/portal/types";

const pct = new Intl.NumberFormat("es-ES", { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" });

/** Indicador con variación. `goodWhenUp` decide si subir es bueno (leads) o malo (coste). */
export function StatTile({
  label,
  value,
  delta,
  goodWhenUp = true,
  vs,
  hot = false,
  neutral = false,
}: {
  label: string;
  value: string;
  delta?: number | null;
  goodWhenUp?: boolean;
  vs?: string;
  hot?: boolean;
  /** Sin juicio bueno/malo (p. ej. inversión). */
  neutral?: boolean;
}) {
  const has = delta != null && Number.isFinite(delta) && Math.abs(delta) >= 0.005;
  const good = has && (delta! > 0) === goodWhenUp;
  return (
    <div className="pc-stat">
      <span className="pc-stat-label">{label}</span>
      <span className="pc-stat-value tabular">
        {value}
        {hot && <i className="pc-hot-dot" aria-hidden />}
      </span>
      {vs && (
        <span className={`pc-delta ${has && !neutral ? (good ? "is-good" : "is-bad") : ""}`}>
          {has ? (
            <>
              <span aria-hidden>{delta! > 0 ? "▲" : "▼"}</span> {pct.format(delta!)} <span className="pc-muted">vs {vs}</span>
              {!neutral && <span className="sr-only">{good ? " (mejor)" : " (peor)"}</span>}
            </>
          ) : (
            <span className="pc-muted">Sin cambios vs {vs}</span>
          )}
        </span>
      )}
    </div>
  );
}

/** Reparto de leads por nota: una barra por nota, valor al final. */
export function ScoreBars({ byScore }: { byScore: number[] }) {
  const max = Math.max(1, ...byScore);
  const total = byScore.reduce((a, b) => a + b, 0);
  return (
    <ul className="pc-scores tabular" aria-label="Leads por nota">
      {[5, 4, 3, 2, 1].map((s) => {
        const v = byScore[s - 1];
        return (
          <li key={s}>
            <Scale score={s} size={9} gap={2} />
            <span className="pc-score-track">
              <span className={`pc-score-bar ${s === 5 ? "is-hot" : s === 4 ? "is-good" : ""}`} style={{ width: `${(v / max) * 100}%` }} />
            </span>
            <span className="pc-score-val">
              {v}
              <span className="pc-muted"> · {total ? Math.round((v / total) * 100) : 0} %</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const STATUS: Record<IncidentStatus, string> = { abierta: "Abierta", en_curso: "En curso", resuelta: "Resuelta" };

export function StatusChip({ status }: { status: IncidentStatus }) {
  return (
    <span className={`pc-chip is-${status}`}>
      <i aria-hidden />
      {STATUS[status]}
    </span>
  );
}

export function PriorityTag({ priority }: { priority: string }) {
  if (priority === "normal" || priority === "baja") return <span className="pc-tag">{priority}</span>;
  return <span className={`pc-tag is-${priority}`}>{priority}</span>;
}

export function Card({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`pc-card ${className}`}>
      {(title || action) && (
        <header className="pc-card-head">
          {title && <h2 className="pc-h2">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="pc-empty">{children}</div>;
}

export function PageHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="pc-page-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="display pc-h1">{title}</h1>
      </div>
      {children && <div className="pc-page-actions">{children}</div>}
    </header>
  );
}

/** Texto con saltos de línea → párrafos o lista. */
export function Lines({ text, as = "p" }: { text: string; as?: "p" | "ul" }) {
  const lines = text.split(/\n+/).map((l) => l.replace(/^[-•·]\s*/, "").trim()).filter(Boolean);
  if (!lines.length) return null;
  if (as === "ul")
    return (
      <ul className="pc-list">
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    );
  return (
    <>
      {lines.map((l, i) => (
        <p key={i}>{l}</p>
      ))}
    </>
  );
}
