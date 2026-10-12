"use client";

import { useEffect, useState } from "react";

/**
 * Demo del hero: llegan contactos de pymes de distintos sectores, el cliente
 * los califica con un toque y esa señal vuelve a la plataforma publicitaria.
 */
type Outcome = "fit" | "no" | "sale";
type Lead = { sector: string; need: string; who: string; detail: string; source: string; outcome: Outcome };

const LEADS: Lead[] = [
  { sector: "Clínica dental", need: "Primera visita · implante", who: "Lucía P.", detail: "Pide cita esta semana", source: "Meta", outcome: "fit" },
  { sector: "Reformas", need: "Baño completo · 6 m²", who: "Marta G.", detail: "Quiere empezar en noviembre", source: "Google Ads", outcome: "sale" },
  { sector: "Formulario web", need: "¿Cuánto cuesta?", who: "Sin nombre", detail: "Sin datos ni plazo", source: "Meta", outcome: "no" },
  { sector: "Asesoría", need: "Cambio de gestoría · autónomo", who: "Javier R.", detail: "Este trimestre", source: "Google LSA", outcome: "fit" },
  { sector: "Energía solar", need: "Placas en chalet · 8 kW", who: "Pablo S.", detail: "Presupuesto aprobado", source: "TikTok", outcome: "sale" },
  { sector: "Academia", need: "Curso intensivo · enero", who: "Sara M.", detail: "Pregunta por grupos reducidos", source: "Google Ads", outcome: "fit" },
];

export const OUTCOMES: Record<Outcome, { label: string; signal: string }> = {
  fit: { label: "Encaja", signal: "«trae más como este»" },
  no: { label: "No encaja", signal: "«no me traigas esto»" },
  sale: { label: "Venta", signal: "«este es el cliente ideal»" },
};

const ORDER: Outcome[] = ["fit", "no", "sale"];

const T_RATE = 1900;
const T_SENT = 2600;
const T_NEXT = 4700;

export function HeroLive() {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<"arrive" | "rate" | "sent">("sent");
  const [history, setHistory] = useState<Lead[]>([LEADS[LEADS.length - 1], LEADS[LEADS.length - 2]]);
  const [quality, setQuality] = useState(58);
  const [count, setCount] = useState(12);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cycle = (n: number) => {
      if (!alive) return;
      const idx = n % LEADS.length;
      setI(idx);
      setPhase("arrive");
      setCount((c) => c + 1);
      timers.push(setTimeout(() => alive && setPhase("rate"), T_RATE));
      timers.push(
        setTimeout(() => {
          if (!alive) return;
          setPhase("sent");
          const l = LEADS[idx];
          setQuality((q) => (q >= 92 ? 64 : Math.min(92, q + (l.outcome === "no" ? 2 : 5))));
        }, T_SENT),
      );
      timers.push(
        setTimeout(() => {
          setHistory((h) => [LEADS[idx], ...h].slice(0, 2));
          cycle(n + 1);
        }, T_NEXT),
      );
    };
    timers.push(setTimeout(() => cycle(1), 1400));
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  const lead = LEADS[i];
  const rated = phase !== "arrive";

  return (
    <div className="hl" aria-label="Ejemplo: así llega y se califica un contacto">
      <div className="hl-panel" data-tilt="5">
        <div className="hl-top">
          <span className="hl-brand">
            <span className="hl-glyph" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            Bandeja de contactos
          </span>
          <span className="hl-live mono">
            <i aria-hidden /> en directo · <span className="tabular">{count}</span> hoy
          </span>
        </div>

        <div key={i} className={`hl-card is-${phase}`}>
          <div className="hl-card-head">
            <span className="hl-sector">{lead.sector}</span>
            <span className="mono hl-src">{lead.source} · ahora</span>
          </div>
          <strong className="hl-need">{lead.need}</strong>
          <span className="hl-detail">
            {lead.who} · {lead.detail}
          </span>

          <div className="hl-actions" role="group" aria-label="Calificar contacto">
            {ORDER.map((o) => (
              <span key={o} className={`hl-btn is-${o} ${rated && lead.outcome === o ? "is-on" : ""}`}>
                <span className="hl-btn-ico" aria-hidden />
                {OUTCOMES[o].label}
              </span>
            ))}
          </div>

          <div className={`hl-sent ${phase === "sent" ? "show" : ""}`}>
            <span className="hl-check" aria-hidden>
              ✓
            </span>
            Señal enviada a {lead.source}: {OUTCOMES[lead.outcome].signal}
          </div>
        </div>

        <ul className="hl-history" aria-hidden>
          {history.map((h, k) => (
            <li key={h.need + k} style={{ opacity: 1 - k * 0.35 }}>
              <span>{h.need}</span>
              <span className={`hl-tag is-${h.outcome}`}>{OUTCOMES[h.outcome].label}</span>
            </li>
          ))}
        </ul>

        <div className="hl-learn">
          <div className="hl-learn-row">
            <span className="mono">Contactos que encajan</span>
            <span className="mono tabular">{quality}%</span>
          </div>
          <span className="hl-learn-bar">
            <span style={{ transform: `scaleX(${quality / 100})` }} />
          </span>
        </div>
      </div>

      <div className="hl-float hl-float-a" data-parallax="0.06" aria-hidden>
        <span className="hl-float-dot" />
        Aviso al móvil en minutos
      </div>
      <div className="hl-float hl-float-b" data-parallax="-0.08" aria-hidden>
        Google · Meta · TikTok
      </div>
      <span className="hl-example mono">Ejemplo</span>
    </div>
  );
}
