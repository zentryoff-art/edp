"use client";

import { useState } from "react";
import { Scale } from "./Scale";

const CRITERIA = ["Busca lo que vendes", "Está en tu zona o mercado", "Tiene un plazo concreto", "Presupuesto o tamaño claro", "Intención de contratar"];

const NOTES = [
  {
    score: 1,
    name: "Fuera de encaje",
    text: "Pide algo que no haces o en una zona que no cubres. No te llega como urgente y no te quita tiempo.",
    action: "Se descarta",
  },
  {
    score: 2,
    name: "Curiosidad",
    text: "Encaja en servicio y zona, pero no hay plazo ni detalle. Suele ser alguien comparando precios.",
    action: "Respuesta automática",
  },
  {
    score: 3,
    name: "En estudio",
    text: "Tiene un plazo aproximado. Aún no sabe qué necesita exactamente, así que conviene un seguimiento.",
    action: "Seguimiento en 48 h",
  },
  {
    score: 4,
    name: "Buen lead",
    text: "Servicio, zona, plazo y presupuesto claros. Está listo para recibir una propuesta concreta.",
    action: "Llamar esta semana",
  },
  {
    score: 5,
    name: "Listo para contratar",
    text: "Lo tiene todo claro y quiere cerrar pronto. Es el que no puedes dejar esperando.",
    action: "Llamar hoy",
  },
];

export function NotaExplorer() {
  const [active, setActive] = useState(4);
  const n = NOTES[active];

  return (
    <div className="nota">
      <div className="nota-tabs" role="tablist" aria-label="Nota del lead">
        {NOTES.map((x, i) => (
          <button
            key={x.score}
            role="tab"
            id={`nota-tab-${x.score}`}
            aria-selected={i === active}
            aria-controls="nota-panel"
            className={`nota-tab ${i === active ? "is-active" : ""}`}
            onClick={() => setActive(i)}
          >
            <span className="nota-num tabular">{x.score}</span>
            <Scale score={x.score} size={7} gap={2} />
          </button>
        ))}
      </div>

      <div className="nota-panel" role="tabpanel" id="nota-panel" aria-labelledby={`nota-tab-${n.score}`}>
        <div className="nota-visual">
          <Scale score={n.score} size={44} gap={8} />
          <div className="nota-big tabular" aria-hidden>
            {n.score}
            <span>/5</span>
          </div>
        </div>

        <div className="nota-copy">
          <p className="eyebrow">Nota {n.score}</p>
          <h3 className="display h3 nota-name">{n.name}</h3>
          <p className="body-serif">{n.text}</p>
          <div className="nota-action">
            <span className="muted">Qué pasa después</span>
            <strong className={n.score === 5 ? "is-hot" : ""}>{n.action}</strong>
          </div>
        </div>

        <ul className="nota-criteria" aria-label="Criterios que cumple">
          {CRITERIA.map((c, i) => {
            const met = i < n.score;
            return (
              <li key={c} className={met ? "is-met" : ""}>
                <span className="check" aria-hidden />
                {c}
                <span className="sr-only">{met ? ": cumple" : ": no cumple"}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
