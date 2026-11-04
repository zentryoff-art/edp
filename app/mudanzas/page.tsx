import "./mudanzas.css";
import type { Metadata } from "next";
import { BookingCalendar } from "@/components/BookingCalendar";
import { Reveal } from "@/components/Reveal";
import { Scale } from "@/components/Scale";
import { Logo } from "@/components/Logo";
import { StickyCta } from "@/components/StickyCta";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { LlamadaPageViewTracker } from "@/components/LlamadaPageViewTracker";
import { CONTACT } from "@/lib/contact";
import { getFaqSchema, getLlamadaServiceSchema } from "@/lib/seo-schema";

export const metadata: Metadata = {
  title: "Sistema de Captación para Empresas de Mudanzas · Estudio Digital Pro",
  description:
    "Tus camiones llenos con mudanzas integrales todo el año. Dejamos de competir por precio en portales: contactos directos y exclusivos para tu empresa. Mes de prueba gratis.",
  alternates: { canonical: "/mudanzas" },
};

const WA_MUDANZAS_TEXT =
  "Hola Jorge / Facundo, tengo una empresa de mudanzas y me gustaría comprobar disponibilidad en mi zona y ver cuántas mudanzas completas podemos captar durante el mes de prueba.";

const PAINS = [
  {
    icon: "01",
    title: "Camiones parados y costes fijos",
    desc: "En temporada baja los gastos no perdonan: leasing de vehículos, alquiler de naves, seguros, nóminas de mozos y mantenimiento de flota.",
  },
  {
    icon: "02",
    title: "Desgaste en portes pequeños",
    desc: "Llenar la semana con transportes de un par de bultos o electrodomésticos satura al personal y gasta combustible, pero no deja margen neto.",
  },
  {
    icon: "03",
    title: "Portales y guerras de precios",
    desc: "Plataformas que venden el mismo contacto a 4 o 5 empresas para que gane el presupuesto más barato. Te desgastas compitiendo contra piratas.",
  },
];

const MECHANISM = [
  {
    step: "Paso 01",
    title: "Anuncios en tu radio de trabajo",
    desc: "Mostramos tu empresa a particulares, familias y negocios de tu ciudad y alrededores en el momento exacto en que buscan una mudanza profesional.",
  },
  {
    step: "Paso 02",
    title: "Calificación en 4 toques en el móvil",
    desc: "Cuando atiendes el servicio, marcas en tu app privada si fue una mudanza cerrada o un servicio que no te interesaba. Tarda 3 segundos.",
  },
  {
    step: "Paso 03",
    title: "El algoritmo aprende y optimiza",
    desc: "El sistema envía esa señal en tiempo real a Meta y Google. La publicidad deja de pujar por portes baratos y concentra el presupuesto en buscar mudanzas completas de alto importe.",
  },
];

const QUAL_METRICS = [
  {
    title: "Mayor tasa de cierre",
    desc: "Tratas con clientes decididos a contratar un servicio profesional y formal, no con curiosos que buscan el porte más barato.",
  },
  {
    title: "Ticket medio más alto",
    desc: "Más peso de mudanzas integrales de pisos completos, chalets y oficinas frente a servicios sueltos de poco margen.",
  },
  {
    title: "Atribución real",
    desc: "Sabes exactamente qué campaña, qué anuncio y qué canal te generó cada mudanza facturada en tu cuenta.",
  },
];

const CASES = [
  {
    badge: "Mudanzas & Guardamuebles",
    metric: "11.810 € facturados",
    title: "Octubre 2026: 52 contactos con solo 782 € de inversión",
    desc: "El 83% fueron llamadas directas al teléfono de clientes listos para contratar traslados de pisos completos y guardamuebles. 8 clientes de alto presupuesto cerrados.",
    client: "Mudanzas Palma · Valencia",
    url: "https://mudanzaspalma.es",
  },
  {
    badge: "Mudanzas & Traslados",
    metric: "+45 llamadas / mes",
    title: "Presupuestos de pisos completos y oficinas",
    desc: "Captación directa en su radio de actuación eliminando intermediarios y subastas de portales. El teléfono suena directamente con el cliente interesado.",
    client: "Mudanzas JG · España",
    url: "https://mudanzaszaragonjg.com/",
  },
  {
    badge: "Plataformas & Elevadores",
    metric: "x2.8 llamadas",
    title: "Apoyo logístico para mudanzas y subida de muebles",
    desc: "Elevación por fachada para muebles de gran volumen y obras. Teléfono sonando a diario para servicios a particulares y empresas colaboradoras.",
    client: "Plataformas La Terra · Valencia",
    url: "https://plataformaslaterra.es",
  },
];

const TEAM = [
  {
    image: "/images/team/jorge.webp",
    name: "Jorge Roldán",
    role: "Estrategia de Crecimiento & Meta Ads",
    bio: "Especialista en adquisición y rentabilidad en Meta Ads (Instagram y Facebook). Punto de contacto directo con tu empresa: analiza tu mercado local, calibra la inversión y asegura que cada euro se traduzca en llamadas y presupuestos cerrados.",
    focus: ["Adquisición en Meta Ads", "Punto de contacto directo", "Estrategia de rentabilidad"],
  },
  {
    image: "/images/team/facundo.webp",
    name: "Facundo Froschauer",
    role: "Google Ads Local, SEO & Conversión Web",
    bio: "Experto en Google Ads de Servicios Locales (LSA), Google Business y SEO técnico. Diseña la arquitectura y páginas de aterrizaje de máxima velocidad para que las visitas de tu ciudad se conviertan inmediatamente en llamadas.",
    focus: ["Google Ads & Servicios Locales", "Google Business & SEO Local", "Landings de alta conversión"],
  },
];

const FAQ = [
  {
    q: "¿Los contactos que entran son exclusivos para mi empresa?",
    a: "100% exclusivos. No somos un portal ni vendemos el mismo contacto a 5 empresas como hacen Habitissimo o Cronoshare. Cuando un cliente pide presupuesto o llama, habla únicamente con tu empresa.",
  },
  {
    q: "¿Cómo funciona el primer mes de prueba gratis?",
    a: "Diseñamos y montamos tu sistema completo: campañas de captación en tu zona, páginas de aterrizaje, medición y avisos inmediatos a tu móvil. Nuestra tarifa de gestión es 0 € durante 30 días; tú solo abonas la inversión neta que decidas para los anuncios.",
  },
  {
    q: "¿Tengo que firmar permanencia después del mes de prueba?",
    a: "Cero permanencia. Si las mudanzas que cierras durante los primeros 30 días cubren con creces la inversión y quieres seguir llenando camiones, continuamos trabajando mes a mes. Si decides no seguir, todo lo montado queda de tu propiedad.",
  },
  {
    q: "¿Qué pasa si ya hay muchas empresas de mudanzas en mi ciudad?",
    a: "Precisamente por eso el sistema califica los servicios. Mientras tu competencia puja a ciegas por palabras clave genéricas y se pelea por portes baratos, nuestro algoritmo aprende de tus cierres reales y busca a los clientes que pagan por mudanzas completas.",
  },
  {
    q: "¿Tengo que tener experiencia previa en publicidad o cuentas creadas?",
    a: "No hace falta absolutamente nada. Nosotros nos encargamos de toda la configuración técnica, alta de campañas, textos, diseño y conexión con tu teléfono. Solo necesitas atender las llamadas y presupuestar.",
  },
  {
    q: "¿Puedo preguntar directamente por WhatsApp antes de agendar?",
    a: `Por supuesto. Puedes escribirnos al ${CONTACT.phoneDisplay} o pulsar el botón de WhatsApp en cualquier momento y te contestamos de forma directa en minutos.`,
  },
];

export default function MudanzasLandingPage() {
  const faqSchema = getFaqSchema(FAQ);
  const serviceSchema = getLlamadaServiceSchema();

  return (
    <>
      <LlamadaPageViewTracker nicheCategory="mudanzas" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      {/* ── Header ───────────────────────────── */}
      <header className="lp-header">
        <div className="wrap lp-header-row">
          <a href="/" aria-label="Estudio Digital Pro, inicio">
            <Logo size={16} />
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <WhatsAppCta
              variant="badge"
              source="mudanzas_header"
              prefilledText={WA_MUDANZAS_TEXT}
            >
              WhatsApp
            </WhatsAppCta>
            <a href="#reservar" className="btn btn-ink lp-header-cta">
              Comprobar disponibilidad
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* ── Bloque 1: Hero ───────────────────── */}
        <section className="lp-hero">
          <div className="wrap">
            <div style={{ maxWidth: "860px" }}>
              <Reveal>
                <p className="eyebrow">
                  <Scale score={5} size={6} gap={2} label="" /> SISTEMA DE CAPTACIÓN PARA EMPRESAS DE MUDANZAS
                </p>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="display lp-h1">
                  Tus camiones llenos con mudanzas integrales. Todo el año.
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="lede" style={{ fontSize: "clamp(18px, 2.2vw, 21px)" }}>
                  Dejamos de competir por precio en portales. Conectamos tus anuncios para que el algoritmo aprenda
                  qué servicios te dejan dinero y te traiga clientes que buscan mudanzas completas.
                </p>
              </Reveal>

              <Reveal delay={220}>
                <ul className="lp-hero-bullets">
                  <li>
                    <span className="check">✓</span>
                    <span><strong>Contactos directos y exclusivos</strong> para tu empresa (sin subastas ni datos compartidos).</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span><strong>Notificación inmediata a tu teléfono</strong> con los datos de cada servicio en segundos.</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span><strong>Mes de prueba sin riesgo:</strong> montaje y gestión técnica gratis (tú solo cubres la publicidad).</span>
                  </li>
                </ul>
              </Reveal>

              <Reveal delay={280} className="lp-hero-ctas">
                <a href="#reservar" className="btn btn-accent">
                  Comprobar disponibilidad en mi zona <span className="arrow">→</span>
                </a>
                <WhatsAppCta source="mudanzas_hero" prefilledText={WA_MUDANZAS_TEXT}>
                  Consultar por WhatsApp directo
                </WhatsAppCta>
                <span className="mono muted lp-hero-note">
                  O llámanos directamente al <a href={`tel:${CONTACT.phone}`}>{CONTACT.phoneDisplay}</a>
                </span>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Bloque 2: Los 3 Dolores Reales ──── */}
        <section className="lp-pains">
          <div className="wrap">
            <Reveal>
              <p className="eyebrow">La realidad del sector</p>
              <h2 className="display h2">Por qué los métodos tradicionales queman tu margen.</h2>
              <p className="lede muted" style={{ marginTop: "10px", maxWidth: "680px" }}>
                La mayoría de empresas de mudanzas sufren los mismos tres cuellos de botella que limitan su rentabilidad:
              </p>
            </Reveal>
            <div className="lp-pains-grid">
              {PAINS.map((p, i) => (
                <Reveal key={p.title} delay={i * 90} className="lp-pain-card">
                  <div className="lp-pain-icon">{p.icon}</div>
                  <h3 className="lp-pain-title">{p.title}</h3>
                  <p className="lp-pain-desc">{p.desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bloque 3: El Mecanismo Real ─────── */}
        <section className="lp-mech">
          <div className="wrap">
            <Reveal>
              <p className="eyebrow">El mecanismo</p>
              <h2 className="display h2">Cómo tus ventas reales entrenan a Meta y Google.</h2>
              <p className="lede muted" style={{ marginTop: "10px", maxWidth: "720px" }}>
                En lugar de paneles complejos o informes que nadie lee, el bucle de optimización funciona en 3 pasos operativos sencillos:
              </p>
            </Reveal>
            <div className="lp-mech-grid">
              {MECHANISM.map((m, i) => (
                <Reveal key={m.title} delay={i * 100} className="lp-mech-card">
                  <span className="lp-mech-num">{m.step}</span>
                  <h3>{m.title}</h3>
                  <p>{m.desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bloque 4: Impacto y Casos Reales ── */}
        <section className="lp-cases">
          <div className="wrap">
            <Reveal className="lp-cases-head">
              <p className="eyebrow">Resultados demostrables</p>
              <h2 className="display h2">Foco en calidad y rentabilidad, no en volumen bruto.</h2>
              <p className="lede muted" style={{ marginTop: "10px" }}>
                No buscamos llenarte el teléfono de curiosos que piden precio para mover una lavadora. Buscamos traslados de alto valor.
              </p>
            </Reveal>

            {/* Métricas cualitativas */}
            <div className="lp-qual-grid">
              {QUAL_METRICS.map((q, i) => (
                <Reveal key={q.title} delay={i * 80} className="lp-qual-item">
                  <h3 className="lp-qual-title">{q.title}</h3>
                  <p className="lp-qual-desc">{q.desc}</p>
                </Reveal>
              ))}
            </div>

            {/* Tarjetas de casos reales */}
            <div className="lp-cases-grid">
              {CASES.map((c, i) => (
                <Reveal key={c.title} delay={i * 90} className="lp-case-card">
                  <div>
                    <span className="lp-case-badge">{c.badge}</span>
                    <div className="lp-case-metric" style={{ marginTop: "14px" }}>{c.metric}</div>
                    <h3 className="lp-case-title">{c.title}</h3>
                    <p className="lp-case-desc" style={{ marginTop: "10px" }}>{c.desc}</p>
                  </div>
                  <div className="lp-case-client">
                    {c.url ? (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "3px" }}
                      >
                        {c.client} ↗
                      </a>
                    ) : (
                      c.client
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Equipo Fundador ─────────────────── */}
        <section className="lp-team">
          <div className="wrap">
            <Reveal className="lp-team-head">
              <p className="eyebrow">Equipo Fundador</p>
              <h2 className="display h2">Hablarás directamente con nosotros.</h2>
              <p className="lede muted" style={{ marginTop: "10px" }}>
                Sin comerciales a comisión ni intermediarios. En la videollamada revisamos tu zona geográfica personas con experiencia
                técnica y de negocio real.
              </p>
            </Reveal>
            <div className="lp-team-grid">
              {TEAM.map((member, i) => (
                <Reveal key={member.name} delay={i * 90} className="lp-team-card">
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <img
                      src={member.image}
                      alt={member.name}
                      className="lp-team-avatar-img"
                      width={64}
                      height={64}
                      loading="lazy"
                      decoding="async"
                    />
                    <div>
                      <h3 className="lp-team-name">{member.name}</h3>
                      <div className="lp-team-role">{member.role}</div>
                    </div>
                  </div>
                  <p className="lp-team-bio">{member.bio}</p>
                  <ul className="lp-team-focus">
                    {member.focus.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
            <Reveal delay={200} className="lp-team-promise">
              <p>
                <strong>Compromiso de honestidad:</strong> Si tras revisar tu ciudad consideramos que no hay suficiente
                demanda rentable para llenar tus camiones, te lo diremos claramente sin intentar venderte nada.
              </p>
              <a href="#reservar" className="btn btn-ink" style={{ flexShrink: 0 }}>
                Comprobar mi zona con el equipo →
              </a>
            </Reveal>
          </div>
        </section>

        {/* ── Bloque 5: La Oferta Destacada ───── */}
        <section className="lp-offer-section">
          <div className="wrap">
            <Reveal className="lp-offer-box">
              <span className="lp-offer-badge">Garantía sin riesgo comercial</span>
              <h2 className="display h2">Primer mes de gestión técnica bonificado: 100% gratis.</h2>
              <p>
                Montamos las campañas en tu ciudad, la infraestructura técnica de captación y la conexión directa a tu teléfono móvil.
                Durante los primeros 30 días nuestro trabajo corre completamente por nuestra cuenta: tú solo cubres la inversión publicitaria neta que decidas.
                Sin permanencia, sin penalizaciones y con todo lo creado de tu propiedad.
              </p>
              <div className="lp-offer-actions">
                <a href="#reservar" className="btn btn-accent">
                  Comprobar disponibilidad en mi zona <span className="arrow">→</span>
                </a>
                <WhatsAppCta source="mudanzas_offer" prefilledText={WA_MUDANZAS_TEXT}>
                  Consultar condiciones por WhatsApp
                </WhatsAppCta>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Bloque 6: Calendario y Rescate ─── */}
        <section id="reservar" className="section lp-book">
          <div className="wrap lp-book-grid">
            <div className="lp-book-copy">
              <Reveal>
                <p className="eyebrow">Diagnóstico de 20 minutos</p>
                <h2 className="display h2">Elige día y hora.</h2>
              </Reveal>
              <Reveal delay={100}>
                <p className="lede muted">
                  Hablas directamente con el equipo fundador para revisar tu zona de cobertura, calcular los números de tu empresa y ver la viabilidad real.
                </p>
              </Reveal>

              {/* Red de seguridad bajo el calendario */}
              <Reveal delay={160} className="lp-rescue-box">
                <h4>¿Prefieres hablar directamente ahora mismo?</h4>
                <p>
                  Si tienes una duda puntual o prefieres no agendar llamada formal en la agenda, puedes llamarnos o escribirnos de inmediato:
                </p>
                <div className="lp-rescue-actions">
                  <a href={`tel:${CONTACT.phone}`} className="lp-call-btn">
                    📞 Llamar al {CONTACT.phoneDisplay}
                  </a>
                  <WhatsAppCta source="mudanzas_calendar_rescue" prefilledText={WA_MUDANZAS_TEXT}>
                    Escribir por WhatsApp
                  </WhatsAppCta>
                </div>
              </Reveal>
            </div>
            <Reveal delay={120}>
              <BookingCalendar />
            </Reveal>
          </div>
        </section>

        {/* ── Bloque 7: Preguntas Frecuentes ─── */}
        <section className="section">
          <div className="wrap faq-grid">
            <Reveal>
              <p className="eyebrow">Dudas resueltas</p>
              <h2 className="display h2">Preguntas frecuentes del sector.</h2>
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
      </main>

      {/* ── Footer ───────────────────────────── */}
      <footer className="lp-footer">
        <div className="wrap footer-legal">
          <span>© {new Date().getFullYear()} Estudio Digital Pro</span>
          <span className="lp-footer-contact">
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            <a href={`tel:${CONTACT.phone}`}>{CONTACT.phoneDisplay}</a>
            <a href="/aviso-legal" style={{ color: "var(--muted-dark)", textDecoration: "underline" }}>Aviso Legal</a>
            <a href="/privacidad" style={{ color: "var(--muted-dark)", textDecoration: "underline" }}>Privacidad</a>
          </span>
        </div>
      </footer>

      {/* ── Barra fija en móvil con Agenda + WhatsApp ── */}
      <StickyCta target="reservar" whatsappText={WA_MUDANZAS_TEXT}>
        Comprobar disponibilidad <span className="arrow">→</span>
      </StickyCta>
    </>
  );
}

