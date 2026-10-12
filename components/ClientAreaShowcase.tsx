"use client";

import "@/app/home.css";
import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";
import { Counter } from "./home/Counter";

type Tab = "resumen" | "contactos" | "informes" | "soporte";

const TABS: { key: Tab; label: string }[] = [
  { key: "resumen", label: "Resumen" },
  { key: "contactos", label: "Contactos" },
  { key: "informes", label: "Informes" },
  { key: "soporte", label: "Soporte" },
];

const FEATURES = [
  {
    k: "01",
    t: "Tus cifras, en directo",
    d: "Contactos, coste por contacto, inversión, ventas y retorno. Por canal, por campaña y por zona. Los mismos datos que vemos nosotros.",
  },
  {
    k: "02",
    t: "Calificas en un toque",
    d: "Te llega el aviso al móvil y marcas si encaja, si no o si ha sido venta. Esa señal vuelve sola a Google y Meta.",
  },
  {
    k: "03",
    t: "Informes que se entienden",
    d: "Cada mes: qué ha funcionado, qué no y qué cambiamos. Con cifras, también cuando el dato es malo.",
  },
  {
    k: "04",
    t: "Reuniones y soporte",
    d: "Reservas una llamada en dos clics y abres incidencias con chat. Ves en qué estado está cada cosa.",
  },
];

const WEEKS = [38, 44, 41, 52, 49, 61, 58, 72];

const LEADS = [
  { n: "Reforma de baño", w: "Marta G. · Google Ads", s: "sale", l: "Venta · 4.200 €" },
  { n: "Primera visita dental", w: "Lucía P. · Meta", s: "fit", l: "Encaja" },
  { n: "¿Cuánto cuesta?", w: "Formulario · Meta", s: "no", l: "No encaja" },
  { n: "Cambio de gestoría", w: "Javier R. · Google LSA", s: "new", l: "Calificar" },
];

/** Presentación del área de clientes en la landing: maqueta navegable + qué incluye. */
export function ClientAreaShowcase({ dark = true }: { dark?: boolean }) {
  const [tab, setTab] = useState<Tab>("resumen");
  const [auto, setAuto] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  // Avanza solo mientras está en pantalla y hasta que el usuario toca una pestaña.
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const io = new IntersectionObserver(([e]) => {
      clearInterval(timer);
      if (e.isIntersecting) {
        timer = setInterval(() => {
          setTab((t) => TABS[(TABS.findIndex((x) => x.key === t) + 1) % TABS.length].key);
        }, 5200);
      }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => {
      io.disconnect();
      clearInterval(timer);
    };
  }, [auto]);

  const pick = (k: Tab) => {
    setAuto(false);
    setTab(k);
  };

  return (
    <section id="area" className={`section ca2 ${dark ? "dark" : ""}`}>
      <div className="ca2-blobs" aria-hidden>
        <span className="blob blob-1" />
        <span className="blob blob-2" />
      </div>
      <div className="ca2-grid-bg" aria-hidden />

      <div className="wrap ca2-inner">
        <div className="section-head">
          <Reveal>
            <p className="eyebrow">
              <span className="eyebrow-dot" aria-hidden /> Área de clientes
            </p>
            <h2 className="display h2">
              Todo tu negocio, <span className="grad-text">en una pantalla.</span>
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="lede muted">
              Cada cliente tiene su área privada, también como app en el móvil. Ves cada contacto, cuánto te cuesta y
              cuánto factura, sin esperar a que te lo contemos.
            </p>
          </Reveal>
        </div>

        <Reveal delay={120} className="ca2-stage">
          <div ref={ref} className="ca2-stage-in">
            <div className="ca2-window" data-tilt="3">
              <div className="ca2-bar">
                <span className="ca2-dots" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
                <span className="mono ca2-url">estudiodigitalpro.com/clientes</span>
                <span className="ca2-tag mono">Ejemplo</span>
              </div>

              <div className="ca2-tabs" role="tablist" aria-label="Secciones del área de clientes">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={tab === t.key}
                    className={`ca2-tab ${tab === t.key ? "is-active" : ""} ${auto ? "is-auto" : ""}`}
                    onClick={() => pick(t.key)}
                  >
                    {t.label}
                    {t.key === "contactos" && <b className="ca2-badge">1</b>}
                    <span className="ca2-tab-progress" aria-hidden />
                  </button>
                ))}
              </div>

              <div className="ca2-body" role="tabpanel">
                {tab === "resumen" && (
                  <div className="ca2-view" key="resumen">
                    <div className="ca2-hello">
                      <span>Hola, Laura.</span>
                      <span className="mono ca2-range">Este mes · todos los canales</span>
                    </div>
                    <div className="ca2-kpis">
                      <div>
                        <small>Contactos</small>
                        <strong>
                          <Counter to={207} />
                        </strong>
                        <em className="up">+18%</em>
                      </div>
                      <div>
                        <small>Coste por contacto</small>
                        <strong>
                          <Counter to={18.4} decimals={2} suffix=" €" />
                        </strong>
                        <em className="up">−9%</em>
                      </div>
                      <div>
                        <small>Ventas cerradas</small>
                        <strong>
                          <Counter to={41} />
                        </strong>
                        <em className="up">+6</em>
                      </div>
                      <div className="is-hot">
                        <small>Retorno (ROAS)</small>
                        <strong>
                          <Counter to={6.2} decimals={1} suffix="×" />
                        </strong>
                        <em>por cada € invertido</em>
                      </div>
                    </div>
                    <div className="ca2-chart">
                      <div className="ca2-chart-head">
                        <span>Contactos por semana</span>
                        <span className="ca2-legend mono">
                          <i className="g" /> Google <i className="m" /> Meta
                        </span>
                      </div>
                      <div className="ca2-bars">
                        {WEEKS.map((v, k) => (
                          <span key={k} className="ca2-col" style={{ "--h": `${v}%`, "--d": `${k * 60}ms` } as React.CSSProperties}>
                            <span className="m" style={{ height: "38%" }} />
                            <span className="g" style={{ height: "62%" }} />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {tab === "contactos" && (
                  <div className="ca2-view" key="contactos">
                    <div className="ca2-sub">
                      <span className="is-active">
                        Sin calificar <b>1</b>
                      </span>
                      <span>En conversación</span>
                      <span>Cerrados</span>
                    </div>
                    <ul className="ca2-leads">
                      {LEADS.map((l, k) => (
                        <li key={l.n} style={{ "--d": `${k * 90}ms` } as React.CSSProperties}>
                          <div>
                            <strong>{l.n}</strong>
                            <span>{l.w}</span>
                          </div>
                          <span className={`ca2-state is-${l.s}`}>{l.l}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="ca2-sync mono">
                      <span className="ok">✓ Google</span>
                      <span className="ok">✓ Meta</span>
                      Señales sincronizadas hace 2 min
                    </p>
                  </div>
                )}

                {tab === "informes" && (
                  <div className="ca2-view ca2-report" key="informes">
                    <div className="ca2-doc">
                      <span className="mono ca2-doc-k">Informe mensual · Septiembre</span>
                      <strong className="ca2-doc-t">Más ventas con menos inversión.</strong>
                      <div className="ca2-doc-cols">
                        <div>
                          <small>Lo que ha funcionado</small>
                          <p>Campaña de búsqueda local: el 62 % de las ventas.</p>
                        </div>
                        <div>
                          <small>Lo que no</small>
                          <p>Anuncios de vídeo: muchos contactos, pocos encajan.</p>
                        </div>
                        <div>
                          <small>Qué cambiamos</small>
                          <p>Pasamos ese presupuesto a búsqueda y ajustamos zonas.</p>
                        </div>
                      </div>
                    </div>
                    <div className="ca2-compare">
                      <div>
                        <span className="mono">Google</span>
                        <span className="ca2-meter">
                          <i style={{ "--w": 0.72 } as React.CSSProperties} />
                        </span>
                        <strong className="tabular">14,90 €</strong>
                      </div>
                      <div>
                        <span className="mono">Meta</span>
                        <span className="ca2-meter">
                          <i style={{ "--w": 0.48 } as React.CSSProperties} />
                        </span>
                        <strong className="tabular">23,10 €</strong>
                      </div>
                      <small className="muted">Coste por contacto que encaja</small>
                    </div>
                  </div>
                )}

                {tab === "soporte" && (
                  <div className="ca2-view ca2-support" key="soporte">
                    <div className="ca2-next">
                      <small>Próxima llamada</small>
                      <strong>Miércoles, 10:20</strong>
                      <span className="mono">20 min · con el fundador</span>
                    </div>
                    <div className="ca2-chat">
                      <span className="ca2-chat-k mono">Incidencia · En curso</span>
                      <p className="me">¿Podemos parar los anuncios el puente de diciembre?</p>
                      <p className="them">Hecho. Se pausan del 5 al 8 y vuelven solos el lunes.</p>
                      <span className="ca2-typing" aria-hidden>
                        <i />
                        <i />
                        <i />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="ca2-phone" data-parallax="-0.07" aria-hidden>
              <div className="ca2-phone-in">
                <span className="ca2-phone-notch" />
                <div className="ca2-push">
                  <span className="ca2-push-k mono">EDP · ahora</span>
                  <strong>Nuevo contacto</strong>
                  <span>Instalación placas solares · Valencia</span>
                </div>
                <div className="ca2-phone-actions">
                  <span className="fit">Encaja</span>
                  <span className="no">No</span>
                  <span className="sale">Venta</span>
                </div>
                <div className="ca2-phone-kpi">
                  <small>Este mes</small>
                  <strong className="tabular">41 ventas</strong>
                </div>
                <div className="ca2-phone-nav">
                  <i className="on" />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="ca2-features">
          {FEATURES.map((f, i) => (
            <Reveal key={f.t} delay={i * 80} className="ca2-feature">
              <div className="spot-card" data-spot>
                <span className="mono ca2-feature-k">{f.k}</span>
                <h3 className="display h3">{f.t}</h3>
                <p className="body-serif muted">{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200} className="ca2-cta">
          <a href="/clientes" className="btn btn-ghost" data-magnetic="0.2">
            ¿Ya eres cliente? Entra en tu área <span className="arrow">→</span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
