import "@/app/home.css";
import { Reveal } from "./Reveal";
import { Scale } from "./Scale";

const FEATURES = [
  {
    t: "Tus resultados, siempre a la vista",
    d: "Contactos, calidad, coste por cliente potencial y evolución semana a semana. Los mismos datos que vemos nosotros.",
  },
  {
    t: "Informes mensuales claros",
    d: "Qué ha funcionado, qué no y qué vamos a cambiar. Con cifras, también cuando el dato es malo.",
  },
  {
    t: "Agenda una reunión en dos clics",
    d: "Eliges día y hora en el calendario y te llamamos. Sin cadenas de correos.",
  },
  {
    t: "Incidencias con respuesta",
    d: "Nos escribes desde el área, ves en qué estado está y te contestamos ahí mismo.",
  },
];

const BARS = [
  [14, 30],
  [18, 29],
  [16, 31],
  [21, 27],
  [19, 30],
  [24, 26],
  [23, 28],
  [28, 24],
];

/** Maqueta del área de clientes + lo que incluye. */
export function ClientAreaShowcase({ dark = false }: { dark?: boolean }) {
  return (
    <section id="area" className={`section ca ${dark ? "dark" : ""}`}>
      <div className="wrap ca-grid">
        <div className="ca-copy">
          <Reveal>
            <p className="eyebrow">Área de clientes</p>
            <h2 className="display h2">Transparencia total, en un solo sitio.</h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="lede muted">
              Cada cliente tiene su área privada: ves lo que está pasando con tu cuenta en cualquier momento, sin
              esperar a que te lo contemos.
            </p>
          </Reveal>
          <ul className="ca-features">
            {FEATURES.map((f, i) => (
              <Reveal as="li" key={f.t} delay={140 + i * 70}>
                <Scale score={i + 2} size={7} gap={2} label="" />
                <div>
                  <strong>{f.t}</strong>
                  <p>{f.d}</p>
                </div>
              </Reveal>
            ))}
          </ul>
          <Reveal delay={420}>
            <a href="/clientes" className="link">
              ¿Ya eres cliente? Entra en tu área →
            </a>
          </Reveal>
        </div>

        <Reveal delay={120} className="ca-mock-wrap">
          <div className="ca-mock" aria-hidden>
            <div className="ca-bar">
              <i />
              <i />
              <i />
              <span className="mono">estudiodigitalpro.com/clientes</span>
            </div>
            <div className="ca-app">
              <div className="ca-side">
                <span className="ca-logo">
                  <Scale score={5} size={5} gap={2} label="" />
                </span>
                <span className="ca-nav is-active">Resumen</span>
                <span className="ca-nav">Informes</span>
                <span className="ca-nav">Llamadas</span>
                <span className="ca-nav">
                  Incidencias <b>1</b>
                </span>
              </div>
              <div className="ca-main">
                <span className="ca-hello">Hola, Laura.</span>
                <div className="ca-stats tabular">
                  <span>
                    <small>Contactos</small>207
                  </span>
                  <span>
                    <small>Nota 4–5</small>75
                  </span>
                  <span>
                    <small>Coste calificado</small>31,62 €<i />
                  </span>
                </div>
                <div className="ca-chart">
                  {BARS.map(([hot, rest], k) => (
                    <span key={k} className="ca-col">
                      <span className="rest" style={{ height: `${rest * 2}%` }} />
                      <span className="hot" style={{ height: `${hot * 2}%` }} />
                    </span>
                  ))}
                </div>
                <div className="ca-row">
                  <span className="ca-pill">
                    <small>Próxima llamada</small>Miércoles, 10:20
                  </span>
                  <span className="ca-pill">
                    <small>Último informe</small>Septiembre
                  </span>
                </div>
              </div>
            </div>
          </div>
          <span className="ca-tag mono">Ejemplo</span>
        </Reveal>
      </div>
    </section>
  );
}
