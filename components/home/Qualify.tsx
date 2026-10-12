"use client";

import { useState } from "react";

type Key = "fit" | "no" | "sale";

const OPTIONS: { key: Key; label: string; hint: string; title: string; text: string; signal: string; next: string }[] = [
  {
    key: "fit",
    label: "Encaja",
    hint: "Es el tipo de cliente que buscas",
    title: "Contacto cualificado",
    text: "Busca lo que vendes, en tu zona y con intención real. Lo sigues trabajando tú; nosotros nos encargamos de que lleguen más así.",
    signal: "Google y Meta lo reciben como contacto cualificado.",
    next: "El algoritmo busca más perfiles parecidos.",
  },
  {
    key: "no",
    label: "No encaja",
    hint: "Spam, fuera de zona o no es lo tuyo",
    title: "Contacto descartado",
    text: "Pide algo que no haces, está fuera de tu zona o solo pregunta precios sin intención. Lo marcas y te olvidas.",
    signal: "La plataforma deja de optimizar hacia ese perfil.",
    next: "Menos contactos que te hacen perder el tiempo.",
  },
  {
    key: "sale",
    label: "Venta",
    hint: "Se ha convertido en cliente",
    title: "Venta cerrada",
    text: "Indicas el importe, aunque sea aproximado. Es la señal más valiosa: le dice a la plataforma cuánto vale de verdad cada cliente.",
    signal: "Se envía como compra con su valor en euros.",
    next: "Las campañas se optimizan para facturación, no para clics.",
  },
];

export function Qualify() {
  const [active, setActive] = useState<Key>("sale");
  const o = OPTIONS.find((x) => x.key === active)!;

  return (
    <div className={`qf spot-card is-${active}`} data-spot>
      <div className="qf-lead">
        <div className="qf-lead-head">
          <span className="mono">Nuevo contacto · Google Ads</span>
          <span className="qf-pill mono">hace 3 min</span>
        </div>
        <strong className="qf-need">Reforma de cocina completa</strong>
        <span className="qf-detail">Ana L. · 12 m² · quiere empezar en enero</span>

        <p className="qf-ask">¿Cómo ha ido este contacto?</p>
        <div className="qf-options" role="tablist" aria-label="Calificar contacto">
          {OPTIONS.map((x) => (
            <button
              key={x.key}
              role="tab"
              id={`qf-tab-${x.key}`}
              aria-selected={active === x.key}
              aria-controls="qf-panel"
              className={`qf-opt is-${x.key} ${active === x.key ? "is-active" : ""}`}
              onClick={() => setActive(x.key)}
            >
              <span className="qf-opt-ico" aria-hidden />
              <span className="qf-opt-label">{x.label}</span>
              <span className="qf-opt-hint">{x.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="qf-result" role="tabpanel" id="qf-panel" aria-labelledby={`qf-tab-${o.key}`} aria-live="polite">
        <div key={o.key} className="qf-result-in">
          <p className="eyebrow">Qué pasa después</p>
          <h3 className="display h3 qf-title">{o.title}</h3>
          <p className="body-serif qf-text">{o.text}</p>

          <ol className="qf-chain">
            <li>
              <span className="qf-node mono">01</span>
              <div>
                <strong>Lo calificas</strong>
                <span>Un toque desde el móvil.</span>
              </div>
            </li>
            <li>
              <span className="qf-node mono">02</span>
              <div>
                <strong>Viaja como señal</strong>
                <span>{o.signal}</span>
              </div>
            </li>
            <li>
              <span className="qf-node mono">03</span>
              <div>
                <strong>El algoritmo aprende</strong>
                <span>{o.next}</span>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
