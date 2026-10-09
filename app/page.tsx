import { Header } from "@/components/Header";
import { HeroDemo } from "@/components/HeroDemo";
import { NotaExplorer } from "@/components/NotaExplorer";
import { AuditForm } from "@/components/AuditForm";
import { ClientAreaShowcase } from "@/components/ClientAreaShowcase";
import { Reveal } from "@/components/Reveal";
import { Scale } from "@/components/Scale";
import { Logo } from "@/components/Logo";
import { CONTACT } from "@/lib/contact";
import { getFaqSchema } from "@/lib/seo-schema";
import "./home.css";

const SECTORS = ["Mudanzas", "Trasteros", "Reformas", "Clínicas", "Inmobiliarias", "Instalaciones", "Servicios profesionales", "Academias"];

const WHAT = [
  {
    t: "Apareces donde te buscan",
    d: "Google Local Services, Google Ads, Meta y TikTok. En el momento exacto en que alguien necesita tu servicio.",
  },
  {
    t: "Una web que convierte",
    d: "Rápida, clara y pensada para que te escriban o te llamen. Sin coste durante el mes de prueba.",
  },
  {
    t: "Cada contacto, en minutos",
    d: "Te avisamos al instante en el móvil. Nadie se queda esperando y ningún cliente potencial se enfría.",
  },
];

const STEPS = [
  { t: "Te encuentran", d: "Tu negocio aparece cuando alguien busca tu servicio en tu zona." },
  { t: "Te contactan", d: "Por formulario o por llamada, desde la web o desde el propio anuncio." },
  { t: "Te avisamos al instante", d: "Te llega una notificación al móvil. No tienes que estar pendiente." },
  { t: "Le pones nota", d: "Con un toque marcas si ese contacto vale la pena o no." },
  { t: "El algoritmo aprende", d: "Tu nota vuelve a Google, Meta o TikTok como señal: cada mes te traen más contactos como los buenos." },
];

const OFFER = [
  "Un mes de gestión gratis: solo pagas la publicidad.",
  "Web optimizada sin coste durante la prueba.",
  "Si no sigues, te entregamos la web y cómo publicarla.",
  "Área de cliente propia desde el primer día.",
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
    a: "Calificar cada contacto que te llega: con un toque dices si vale la pena o no. Es la parte que no podemos hacer por ti y la que hace que el sistema mejore. Sin tus notas, el algoritmo no aprende.",
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
      <Header />

      <main id="top">
        {/* ── Hero ─────────────────────────────── */}
        <section className="hero2">
          <div className="hero2-bg" aria-hidden>
            <Scale score={5} size={180} gap={28} label="" />
          </div>
          <div className="wrap hero2-grid">
            <div className="hero2-copy">
              <Reveal>
                <a href="#prueba" className="hero2-chip">
                  <i aria-hidden /> Primer mes de gestión gratis · sin permanencia
                </a>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="display hero2-title">
                  Conseguimos <span className="hero2-mark">clientes</span> para tu negocio.
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="hero2-lede">
                  No clics, no promesas: <strong>sistemas que convierten.</strong> Publicidad, automatización y trato
                  personal para que te lleguen clientes listos para contratar, no solo tráfico.
                </p>
              </Reveal>
              <Reveal delay={240} className="hero2-ctas">
                <a href="#prueba" className="btn btn-accent">
                  Solicita tu mes de prueba gratis <span className="arrow">→</span>
                </a>
                <a href="/llamada" className="hero2-link">
                  O reserva 20 minutos con el fundador
                </a>
              </Reveal>
              <Reveal delay={320}>
                <dl className="hero2-proof">
                  <div>
                    <dt>Minutos</dt>
                    <dd>para avisarte de cada contacto</dd>
                  </div>
                  <div>
                    <dt>1 de cada 5</dt>
                    <dd>contactos cualificados acaba en cita o venta*</dd>
                  </div>
                  <div>
                    <dt>0 €</dt>
                    <dd>de gestión el primer mes</dd>
                  </div>
                </dl>
              </Reveal>
            </div>
            <Reveal delay={200} className="hero2-demo">
              <HeroDemo />
            </Reveal>
          </div>
          <p className="wrap hero2-foot mono">* Media orientativa. Depende del sector y mejora con el tiempo.</p>
        </section>

        {/* ── Sectores ─────────────────────────── */}
        <div className="ticker" aria-label="Sectores con los que trabajamos">
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

        {/* ── Qué hacemos ─────────────────────── */}
        <section id="que-hacemos" className="section">
          <div className="wrap">
            <div className="section-head">
              <Reveal>
                <p className="eyebrow">Qué hacemos</p>
                <h2 className="display h2">No vendemos anuncios. Vendemos clientes.</h2>
              </Reveal>
              <Reveal delay={100}>
                <p className="lede muted">
                  Construimos y gestionamos el sistema completo que lleva a un cliente potencial desde el primer clic
                  hasta la cita cerrada.
                </p>
              </Reveal>
            </div>
            <div className="what">
              {WHAT.map((w, i) => (
                <Reveal key={w.t} delay={i * 90} className="what-item">
                  <span className="what-n mono tabular">0{i + 1}</span>
                  <h3 className="display h3">{w.t}</h3>
                  <p className="body-serif muted">{w.d}</p>
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
          <div className="wrap">
            <div className="section-head">
              <Reveal>
                <p className="eyebrow">Cómo funciona</p>
                <h2 className="display h2">Un sistema que mejora cada mes.</h2>
              </Reveal>
              <Reveal delay={100}>
                <p className="lede muted">
                  Más contactos, de más calidad, con el mismo presupuesto. La clave es el paso 4: tu nota le enseña al
                  algoritmo qué cliente buscas.
                </p>
              </Reveal>
            </div>
            <ol className="flow">
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.t} delay={i * 80} className={i === 3 ? "is-key" : ""}>
                  <Scale score={i + 1} size={8} gap={2} label="" />
                  <h3 className="display h3">{s.t}</h3>
                  <p className="body-serif">{s.d}</p>
                </Reveal>
              ))}
            </ol>
            <Reveal delay={200}>
              <p className="flow-note">
                <strong>Tu parte:</strong> calificar cada contacto. Necesitamos que estés involucrado en la gestión
                comercial; sin tus notas, el algoritmo no aprende.
              </p>
            </Reveal>
            <Reveal delay={260}>
              <p className="cta-alt">
                ¿Prefieres que te lo expliquemos nosotros? <a href="/llamada">Reserva 20 minutos</a>.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── La nota ─────────────────────────── */}
        <section id="la-nota" className="section">
          <div className="wrap">
            <div className="section-head">
              <Reveal>
                <p className="eyebrow">La nota 1–5</p>
                <h2 className="display h2">Tú pones la nota. El algoritmo aprende.</h2>
              </Reveal>
              <Reveal delay={100}>
                <p className="lede muted">
                  Cinco módulos, cinco criterios. Cuantos más cumple un contacto, más nota. Toca cada una para ver qué
                  significa y qué hacer con él.
                </p>
              </Reveal>
            </div>
            <Reveal>
              <NotaExplorer />
            </Reveal>
          </div>
        </section>

        {/* ── Área de clientes ────────────────── */}
        <ClientAreaShowcase />

        {/* ── Oferta ──────────────────────────── */}
        <section id="prueba-oferta" className="section offer-section">
          <div className="wrap offer">
            <Reveal className="offer-card">
              <p className="eyebrow">Sin actos de fe</p>
              <h2 className="display h2">Ves resultados antes de pagarnos.</h2>
              <ul className="offer-list">
                {OFFER.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
              <p className="offer-foot">
                <strong>Sin permanencia. Sin contratos atados.</strong>
              </p>
              <a href="#prueba" className="btn btn-accent">
                Quiero mi mes de prueba gratis <span className="arrow">→</span>
              </a>
              <p className="section-cta muted">
                ¿Prefieres hablarlo antes? <a href="/llamada" className="link">Reserva 20 minutos con el fundador</a>.
              </p>
            </Reveal>
            <div className="direct">
              <Reveal>
                <p className="eyebrow">Trato directo</p>
                <h3 className="display h3 direct-title">Hablas con quien toma las decisiones.</h3>
                <p className="body-serif muted">Cuando nos escribes, te contesta el fundador. Nada de call center, tickets ni intermediarios.</p>
              </Reveal>
              <ul className="direct-list">
                {[
                  ["WhatsApp directo", "con nuestro asistente para cualquier duda o ajuste."],
                  ["Reuniones", "que agendas tú desde el área de clientes."],
                  ["Respuesta rápida", "porque tu negocio no espera."],
                ].map(([t, d], i) => (
                  <Reveal as="li" key={t} delay={100 + i * 70}>
                    <strong>{t}</strong> {d}
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
                <p className="eyebrow">Para quién</p>
                <h2 className="display h2">Si tu negocio vive de que suene el teléfono.</h2>
              </Reveal>
              <Reveal delay={100}>
                <p className="lede muted">
                  Pymes de servicios que necesitan clientes de forma constante, donde cada cliente cuenta.
                </p>
              </Reveal>
            </div>
            <div className="sectors">
              {[
                { t: "Mudanzas y trasteros", d: "Particulares, empresas y guardamuebles." },
                { t: "Reformas e instalaciones", d: "Cocinas, baños, integrales, energía solar." },
                { t: "Clínicas y centros", d: "Dental, estética, fisioterapia, veterinaria." },
                { t: "Inmobiliarias", d: "Captación de propietarios y compradores." },
                { t: "Servicios profesionales", d: "Asesorías, despachos, academias." },
                { t: "Tu sector", d: "Si cada cliente cuenta, hablemos." },
              ].map((x, i) => (
                <Reveal key={x.t} delay={i * 60} className="sector">
                  <span className="sector-status mono">0{i + 1}</span>
                  <h3 className="display h3">{x.t}</h3>
                  <p className="body-serif muted">{x.d}</p>
                </Reveal>
              ))}
            </div>
            <Reveal delay={280}>
              <p className="section-cta muted">
                ¿No ves tu sector? <a href="/llamada" className="link">Cuéntanoslo en una llamada de 20 minutos</a>.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────── */}
        <section id="preguntas" className="section faq-section">
          <div className="wrap faq-grid">
            <Reveal>
              <p className="eyebrow">Preguntas</p>
              <h2 className="display h2">Lo que suelen preguntarnos.</h2>
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
          <div className="wrap cta-grid">
            <div>
              <Reveal>
                <Scale score={5} size={40} gap={7} label="" />
              </Reveal>
              <Reveal delay={80}>
                <h2 className="display h2 cta-title">Tu primer mes de gestión, gratis.</h2>
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
            <Reveal delay={120}>
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
        <div className="wrap footer-legal" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <span>© {new Date().getFullYear()} Estudio Digital Pro</span>
          <a href="/privacidad" className="link" style={{ fontSize: "12px", color: "inherit", opacity: 0.8 }}>
            Privacidad y Cookies
          </a>
        </div>
      </footer>
    </>
  );
}
