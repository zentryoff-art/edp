import { Header } from "@/components/Header";
import { AuditForm } from "@/components/AuditForm";
import { ClientAreaShowcase } from "@/components/ClientAreaShowcase";
import { Reveal } from "@/components/Reveal";
import { Logo } from "@/components/Logo";
import { HeroLive } from "@/components/home/HeroLive";
import { Qualify } from "@/components/home/Qualify";
import { Motion } from "@/components/home/Motion";
import { WordRotator } from "@/components/home/WordRotator";
import { CONTACT } from "@/lib/contact";
import { getFaqSchema } from "@/lib/seo-schema";
import "./home.css";

const HERO_WORDS = ["tu pyme.", "tu clínica.", "tu academia.", "tu asesoría.", "tu despacho."];

const SECTORS = [
  "Clínicas",
  "Reformas",
  "Academias",
  "Asesorías",
  "Inmobiliarias",
  "Energía solar",
  "Estética",
  "Fisioterapia",
  "Despachos",
  "Instalaciones",
  "Veterinarias",
  "Mudanzas",
];

const WHAT = [
  {
    t: "Apareces donde te buscan",
    d: "Google Ads, Google Local Services, Meta y TikTok. En el momento exacto en que alguien de tu zona necesita lo que haces.",
    tags: ["Google", "Meta", "TikTok"],
  },
  {
    t: "Una web que convierte",
    d: "Rápida, clara y pensada para que te escriban o te llamen. Sin coste durante el mes de prueba.",
    tags: ["Web", "Formularios", "Llamadas"],
  },
  {
    t: "Cada contacto, en minutos",
    d: "Te avisamos al instante en el móvil. Nadie se queda esperando y ningún cliente potencial se enfría.",
    tags: ["Avisos", "Automatización"],
  },
];

const STEPS = [
  { t: "Te encuentran", d: "Tu negocio aparece cuando alguien busca tu servicio en tu zona." },
  { t: "Te contactan", d: "Por formulario o por llamada, desde la web o desde el propio anuncio." },
  { t: "Te avisamos", d: "Te llega una notificación al móvil. No tienes que estar pendiente." },
  { t: "Lo calificas", d: "Con un toque: encaja, no encaja o se ha convertido en venta." },
  { t: "El algoritmo aprende", d: "Tu calificación vuelve a Google, Meta o TikTok: cada mes te traen más contactos como los buenos." },
];

const OFFER = [
  "Un mes de gestión gratis: solo pagas la publicidad.",
  "Web optimizada sin coste durante la prueba.",
  "Si no sigues, te entregamos la web y cómo publicarla.",
  "Área de cliente propia desde el primer día.",
];

const WHO = [
  { t: "Clínicas y centros", d: "Dental, estética, fisioterapia, veterinaria." },
  { t: "Reformas e instalaciones", d: "Cocinas, baños, integrales, energía solar." },
  { t: "Servicios profesionales", d: "Asesorías, despachos, consultoras." },
  { t: "Formación", d: "Academias y centros de formación." },
  { t: "Inmobiliarias", d: "Captación de propietarios y compradores." },
  { t: "Servicios a domicilio", d: "Mudanzas, trasteros, limpieza, mantenimiento." },
];

const FAQ = [
  {
    q: "¿Cómo funciona el mes de prueba?",
    a: "Montamos las campañas, la web y el sistema de avisos, y lo gestionamos durante un mes sin cobrarte la gestión. Solo pagas lo que inviertas en publicidad, directamente a Google, Meta o TikTok. Ves resultados antes de pagarnos nada.",
  },
  {
    q: "¿Hay permanencia?",
    a: "No. Ni permanencia ni contratos atados. Si al terminar la prueba no quieres seguir, te entregamos el proyecto de la web y cómo desplegarlo.",
  },
  {
    q: "¿Qué tengo que hacer yo?",
    a: "Calificar cada contacto que te llega: con un toque marcas si encaja, si no encaja o si se ha cerrado la venta. Es la parte que no podemos hacer por ti y la que hace que el sistema mejore. Sin tus calificaciones, el algoritmo no aprende.",
  },
  {
    q: "¿Mi sector encaja?",
    a: "Trabajamos con pymes de servicios: clínicas, reformas, academias, asesorías, inmobiliarias, instalaciones y servicios a domicilio. Si tu negocio vive de que te llamen o te escriban y cada cliente cuenta, encaja.",
  },
  {
    q: "¿En qué canales trabajáis?",
    a: "Google Local Services Ads, Google Ads, Meta Ads (Facebook e Instagram) y TikTok Ads. Elegimos la mezcla según dónde busca y decide tu cliente.",
  },
  {
    q: "¿Qué resultados puedo esperar?",
    a: "De media, 1 de cada 5 contactos cualificados termina en cita o venta. El porcentaje exacto depende del sector y mejora con el tiempo, porque cada mes ajustamos campañas y proceso para bajar el coste y subir la calidad.",
  },
  {
    q: "¿Con quién voy a hablar?",
    a: "Con el fundador. Sin call center, sin tickets ni intermediarios. Además tienes tu área de cliente para ver resultados, pedir reuniones y abrir incidencias.",
  },
];

export default function Home() {
  const faqSchema = getFaqSchema(FAQ);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Motion />
      <Header />

      <main id="top">
        {/* ── Hero ─────────────────────────────── */}
        <section className="hx dark">
          <div className="hx-bg" aria-hidden>
            <span className="blob blob-1" data-parallax="0.12" />
            <span className="blob blob-2" data-parallax="-0.08" />
            <span className="blob blob-3" data-parallax="0.05" />
            <span className="hx-grid" />
            <span className="noise" />
          </div>

          <div className="wrap hx-layout">
            <div className="hx-copy">
              <Reveal>
                <a href="#prueba" className="hx-chip">
                  <span className="hx-chip-new mono">Pymes</span>
                  <span>
                    Primer mes de gestión gratis<span className="hx-chip-extra"> · sin permanencia</span>
                  </span>
                  <span className="arrow" aria-hidden>
                    →
                  </span>
                </a>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="display hx-title">
                  <span className="sr-only">Conseguimos clientes para tu pyme.</span>
                  <span aria-hidden>
                    <span className="hx-line">Conseguimos</span> <span className="hx-line">clientes para</span>{" "}
                    <WordRotator words={HERO_WORDS} />
                  </span>
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="hx-lede">
                  Publicidad en Google, Meta y TikTok, una web que convierte y un sistema que{" "}
                  <strong>aprende de cada contacto que calificas</strong>. Para pymes de servicios que viven de que suene
                  el teléfono.
                </p>
              </Reveal>
              <Reveal delay={240} className="hx-ctas">
                <a href="#prueba" className="btn btn-accent btn-lg btn-glow" data-magnetic="0.2">
                  Solicita tu mes de prueba gratis <span className="arrow">→</span>
                </a>
                <a href="/llamada" className="btn btn-ghost btn-lg" data-magnetic="0.15">
                  Reservar 20 minutos
                </a>
              </Reveal>
              <Reveal delay={320}>
                <dl className="hx-proof">
                  <div>
                    <dt>Minutos</dt>
                    <dd>para avisarte de cada contacto</dd>
                  </div>
                  <div>
                    <dt>1 persona</dt>
                    <dd>te atiende: el fundador, sin call center</dd>
                  </div>
                  <div>
                    <dt>0 €</dt>
                    <dd>de gestión el primer mes</dd>
                  </div>
                </dl>
              </Reveal>
            </div>

            <Reveal delay={220} className="hx-visual">
              <HeroLive />
            </Reveal>
          </div>

          <div className="wrap hx-foot">
            <span aria-hidden />
            <a href="#que-hacemos" className="hx-scroll mono" aria-label="Bajar a Qué hacemos">
              <span aria-hidden />
              Desliza
            </a>
          </div>
        </section>

        {/* ── Sectores ─────────────────────────── */}
        <div className="ticker" aria-label="Pymes con las que trabajamos">
          <p className="ticker-label mono">Para pymes de</p>
          <div className="ticker-mask">
            <div className="ticker-track">
              {[0, 1].map((k) => (
                <span key={k} className="ticker-group" aria-hidden={k === 1}>
                  {SECTORS.map((s) => (
                    <span key={s + k}>
                      {s}
                      <i aria-hidden />
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Qué hacemos ─────────────────────── */}
        <section id="que-hacemos" className="section what-section">
          <div className="wrap">
            <div className="section-head">
              <Reveal>
                <p className="eyebrow">
                  <span className="eyebrow-dot" aria-hidden /> Qué hacemos
                </p>
                <h2 className="display h2">
                  No vendemos anuncios. <span className="ink-mark">Vendemos clientes.</span>
                </h2>
              </Reveal>
              <Reveal delay={100}>
                <p className="lede muted">
                  Construimos y gestionamos el sistema completo que lleva a un cliente potencial desde el primer clic
                  hasta la cita cerrada. Tú te dedicas a tu negocio.
                </p>
              </Reveal>
            </div>
            <div className="what">
              {WHAT.map((w, i) => (
                <Reveal key={w.t} delay={i * 90} className="what-cell">
                  <div className="what-item spot-card" data-spot>
                    <span className="what-n mono tabular">0{i + 1}</span>
                    <h3 className="display h3">{w.t}</h3>
                    <p className="body-serif muted">{w.d}</p>
                    <ul className="what-tags">
                      {w.tags.map((t) => (
                        <li key={t} className="mono">
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={280}>
              <p className="section-cta muted">
                ¿Quieres verlo aplicado a tu negocio? <a href="/llamada" className="link">Reserva 20 minutos con el fundador</a>.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── Cómo funciona ───────────────────── */}
        <section id="como-funciona" className="section dark flow-section">
          <div className="flow-blobs" aria-hidden>
            <span className="blob blob-2" data-parallax="0.1" />
          </div>
          <div className="wrap">
            <div className="section-head">
              <Reveal>
                <p className="eyebrow">
                  <span className="eyebrow-dot" aria-hidden /> Cómo funciona
                </p>
                <h2 className="display h2">
                  Un sistema que <span className="grad-text">mejora cada mes.</span>
                </h2>
              </Reveal>
              <Reveal delay={100}>
                <p className="lede muted">
                  Más contactos, de más calidad, con el mismo presupuesto. La clave es el paso 4: tu calificación le
                  enseña al algoritmo qué cliente buscas.
                </p>
              </Reveal>
            </div>
            <ol className="flow">
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.t} delay={i * 110} className={i === 3 ? "is-key" : ""}>
                  <span className="flow-n mono tabular">0{i + 1}</span>
                  <h3 className="display h3">{s.t}</h3>
                  <p className="body-serif">{s.d}</p>
                </Reveal>
              ))}
            </ol>
            <Reveal delay={200}>
              <p className="flow-note">
                <strong>Tu parte:</strong> calificar cada contacto. Necesitamos que estés involucrado en la gestión
                comercial; sin tus calificaciones, el algoritmo no aprende.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── Calificar ───────────────────────── */}
        <section id="calificar" className="section qf-section">
          <div className="wrap">
            <div className="section-head">
              <Reveal>
                <p className="eyebrow">
                  <span className="eyebrow-dot" aria-hidden /> Calificar
                </p>
                <h2 className="display h2">Un toque tuyo. Mejores clientes cada mes.</h2>
              </Reveal>
              <Reveal delay={100}>
                <p className="lede muted">
                  Cuando atiendes un contacto, le dices al sistema cómo ha ido. Pruébalo: elige una opción y mira qué
                  pasa con esa señal.
                </p>
              </Reveal>
            </div>
            <Reveal>
              <Qualify />
            </Reveal>
          </div>
        </section>

        {/* ── Área de clientes ────────────────── */}
        <ClientAreaShowcase />

        {/* ── Oferta ──────────────────────────── */}
        <section id="prueba-oferta" className="section offer-section">
          <div className="wrap offer">
            <Reveal className="offer-cell">
              <div className="offer-card">
                <p className="eyebrow">
                  <span className="eyebrow-dot" aria-hidden /> Sin actos de fe
                </p>
                <h2 className="display h2">Ves resultados antes de pagarnos.</h2>
                <ul className="offer-list">
                  {OFFER.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
                <p className="offer-foot">
                  <strong>Sin permanencia. Sin contratos atados.</strong>
                </p>
                <a href="#prueba" className="btn btn-accent btn-lg btn-glow" data-magnetic="0.2">
                  Quiero mi mes de prueba gratis <span className="arrow">→</span>
                </a>
              </div>
            </Reveal>
            <div className="direct">
              <Reveal>
                <p className="eyebrow">Trato directo</p>
                <h3 className="display h3 direct-title">Hablas con quien toma las decisiones.</h3>
                <p className="body-serif muted">
                  Cuando nos escribes, te contesta el fundador. Nada de call center, tickets ni intermediarios.
                </p>
              </Reveal>
              <ul className="direct-list">
                {[
                  ["WhatsApp directo", "con nuestro asistente para cualquier duda o ajuste."],
                  ["Reuniones", "que agendas tú desde el área de clientes."],
                  ["Respuesta rápida", "porque tu negocio no espera."],
                ].map(([t, d], i) => (
                  <Reveal as="li" key={t} delay={100 + i * 70}>
                    <span className="direct-n mono">0{i + 1}</span>
                    <span>
                      <strong>{t}</strong> {d}
                    </span>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Para quién ──────────────────────── */}
        <section className="section for-section">
          <div className="wrap">
            <div className="section-head">
              <Reveal>
                <p className="eyebrow">
                  <span className="eyebrow-dot" aria-hidden /> Para quién
                </p>
                <h2 className="display h2">Pymes que viven de que suene el teléfono.</h2>
              </Reveal>
              <Reveal delay={100}>
                <p className="lede muted">
                  Negocios de servicios que necesitan clientes de forma constante, donde cada cliente cuenta y cada euro
                  en publicidad tiene que volver.
                </p>
              </Reveal>
            </div>
            <div className="sectors">
              {WHO.map((x, i) => (
                <Reveal key={x.t} delay={i * 60} className="sector-cell">
                  <div className="sector spot-card" data-spot>
                    <span className="sector-n mono">0{i + 1}</span>
                    <h3 className="display h3">{x.t}</h3>
                    <p className="body-serif muted">{x.d}</p>
                  </div>
                </Reveal>
              ))}
              <Reveal delay={WHO.length * 60} className="sector-cell">
                <a href="/llamada" className="sector sector-cta spot-card" data-spot>
                  <span className="sector-n mono">+</span>
                  <h3 className="display h3">¿Tu sector?</h3>
                  <p className="body-serif">Si cada cliente cuenta, hablemos en 20 minutos.</p>
                  <span className="arrow" aria-hidden>
                    →
                  </span>
                </a>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────── */}
        <section id="preguntas" className="section faq-section">
          <div className="wrap faq-grid">
            <Reveal className="faq-head">
              <p className="eyebrow">
                <span className="eyebrow-dot" aria-hidden /> Preguntas
              </p>
              <h2 className="display h2">Lo que suelen preguntarnos.</h2>
              <p className="body-serif muted">
                ¿Otra duda? Escríbenos a <a href={`mailto:${CONTACT.email}`} className="link">{CONTACT.email}</a>.
              </p>
            </Reveal>
            <div className="faq">
              {FAQ.map((f, i) => (
                <Reveal key={f.q} delay={i * 50}>
                  <details className="faq-item">
                    <summary>
                      <span>{f.q}</span>
                      <span className="faq-icon" aria-hidden />
                    </summary>
                    <p className="body-serif">{f.a}</p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Mes de prueba ───────────────────── */}
        <section id="prueba" className="section dark cta-section">
          <div className="cta-blobs" aria-hidden>
            <span className="blob blob-1" />
            <span className="blob blob-3" />
            <span className="noise" />
          </div>
          <div className="wrap cta-grid">
            <div className="cta-copy">
              <Reveal>
                <p className="eyebrow">
                  <span className="eyebrow-dot" aria-hidden /> Empieza ahora
                </p>
              </Reveal>
              <Reveal delay={80}>
                <h2 className="display h2 cta-title">
                  Tu primer mes de gestión, <span className="grad-text">gratis.</span>
                </h2>
              </Reveal>
              <Reveal delay={160}>
                <p className="lede muted">
                  Cuéntanos a qué te dedicas y qué inviertes hoy. Te respondemos con un plan y fecha de arranque. Solo
                  pagas la publicidad.
                </p>
              </Reveal>
              <Reveal delay={220}>
                <p className="cta-alt">
                  ¿Prefieres hablar antes? <a href="/llamada">Reserva 20 minutos</a> o llámanos al{" "}
                  <a href={`tel:${CONTACT.phone}`}>{CONTACT.phoneDisplay}</a>.
                </p>
              </Reveal>
            </div>
            <Reveal delay={120} className="cta-form">
              <AuditForm />
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap footer-grid">
          <div className="footer-brand">
            <Logo size={18} descriptor />
          </div>
          <nav className="footer-links" aria-label="Pie">
            <a href="#que-hacemos">Qué hacemos</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#calificar">Calificar</a>
            <a href="#area">Área de clientes</a>
            <a href="#preguntas">Preguntas</a>
          </nav>
          <div className="footer-contact">
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            <a href={`tel:${CONTACT.phone}`}>{CONTACT.phoneDisplay}</a>
            <a href="/llamada">Reservar una llamada</a>
            <a href="/clientes">Entrar al área de clientes</a>
          </div>
        </div>
        <div className="wrap footer-legal" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <span>© {new Date().getFullYear()} Estudio Digital Pro</span>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "12px" }}>
            <a href="/aviso-legal" className="link" style={{ color: "inherit", opacity: 0.8 }}>
              Aviso Legal
            </a>
            <a href="/privacidad" className="link" style={{ color: "inherit", opacity: 0.8 }}>
              Privacidad
            </a>
            <a href="/terminos" className="link" style={{ color: "inherit", opacity: 0.8 }}>
              Términos
            </a>
            <a href="/cookies" className="link" style={{ color: "inherit", opacity: 0.8 }}>
              Cookies
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
