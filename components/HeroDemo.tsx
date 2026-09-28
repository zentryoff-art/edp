"use client";

import { useEffect, useState } from "react";

/**
 * Demo animada del sistema: llega un contacto → el cliente le pone nota →
 * la nota vuelve a la plataforma y el algoritmo aprende.
 */
type Lead = { name: string; need: string; detail: string; source: string; score: number };

const LEADS: Lead[] = [
  { name: "Marta G.", need: "Reforma integral · piso 90 m²", detail: "Quiere empezar en noviembre · presupuesto aprobado", source: "Google", score: 5 },
  { name: "Consulta web", need: "¿Cuánto cuesta?", detail: "Sin datos ni plazo", source: "Meta", score: 1 },
  { name: "Javier R.", need: "Mudanza Valencia → Madrid", detail: "Fecha fija · 3 habitaciones", source: "Google LSA", score: 5 },
  { name: "Clínica · Lucía P.", need: "Implante dental", detail: "Pide cita esta semana", source: "Meta", score: 4 },
  { name: "Trastero · Pablo S.", need: "Trastero 6 m² · 4 meses", detail: "Empieza el día 1", source: "TikTok", score: 4 },
];

// Fases de cada ciclo (ms)
const T_ARRIVE = 0;
const T_RATE = 1900;
const T_SENT = 2700;
const T_NEXT = 4600;

export function HeroDemo() {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<"arrive" | "rate" | "sent">("sent");
  const [learned, setLearned] = useState(62);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cycle = (n: number) => {
      if (!alive) return;
      setI(n % LEADS.length);
      setPhase("arrive");
      timers.push(setTimeout(() => alive && setPhase("rate"), T_RATE - T_ARRIVE));
      timers.push(
        setTimeout(() => {
          if (!alive) return;
          setPhase("sent");
          setLearned((v) => Math.min(94, v + (LEADS[n % LEADS.length].score >= 4 ? 4 : 1)));
        }, T_SENT),
      );
      timers.push(setTimeout(() => cycle(n + 1), T_NEXT));
    };
    timers.push(setTimeout(() => cycle(1), 1200));
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  const lead = LEADS[i];
  const rated = phase !== "arrive";
  const good = lead.score >= 4;

  return (
    <div className="hd" aria-label="Ejemplo: así llega y se califica un contacto">
      <div className="hd-phone">
        <div className="hd-status mono">
          <span>09:41</span>
          <span className="hd-live">
            <i aria-hidden /> en directo
          </span>
        </div>

        <div key={i} className={`hd-card ${phase}`}>
          <div className="hd-card-top">
            <span className="hd-app">
              <span className="hd-app-icon" aria-hidden>
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
              EDP · Nuevo contacto
            </span>
            <span className="mono hd-time">ahora</span>
          </div>
          <strong className="hd-need">{lead.need}</strong>
          <span className="hd-detail">
            {lead.name} · {lead.detail}
          </span>
          <span className="hd-source mono">vía {lead.source}</span>

          <div className="hd-rate" role="group" aria-label="Nota del contacto">
            <span className="hd-rate-label">¿Qué nota le pones?</span>
            <div className="hd-rate-row">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={`hd-dot ${rated && n <= lead.score ? "on" : ""} ${rated && n === lead.score ? "tap" : ""} ${n === 5 ? "top" : ""}`}
                  style={{ transitionDelay: rated ? `${n * 45}ms` : "0ms" }}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>

          <div className={`hd-sent ${phase === "sent" ? "show" : ""}`}>
            <span className="hd-check" aria-hidden>
              ✓
            </span>
            {good ? `Enviado a ${lead.source}: «trae más como este»` : `Enviado a ${lead.source}: «no me traigas esto»`}
          </div>
        </div>

        <div className="hd-ghost" aria-hidden />
        <div className="hd-ghost two" aria-hidden />
      </div>

      <div className="hd-learn">
        <span className="hd-learn-label mono">Calidad de los contactos</span>
        <span className="hd-learn-bar">
          <span style={{ width: `${learned}%` }} />
        </span>
        <span className="hd-learn-note">El algoritmo aprende de cada nota que pones.</span>
      </div>
    </div>
  );
}
