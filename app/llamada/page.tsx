import "./llamada.css";
import type { Metadata } from "next";
import { BookingCalendar } from "@/components/BookingCalendar";
import { VideoPitch } from "@/components/VideoPitch";
import { Reveal } from "@/components/Reveal";
import { Scale } from "@/components/Scale";
import { Logo } from "@/components/Logo";
import { StickyCta } from "@/components/StickyCta";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { LlamadaPageViewTracker } from "@/components/LlamadaPageViewTracker";
import { CONTACT, VIDEO as VIDEO_URLS } from "@/lib/contact";
import { getFaqSchema, getLlamadaServiceSchema } from "@/lib/seo-schema";

export const metadata: Metadata = {
  title: "Llamada de 20 minutos con los fundadores · Estudio Digital Pro",
  description:
    "20 minutos con los fundadores para analizar el volumen real de clientes en tu ciudad y qué sistema montaríamos. Si encaja, primer mes de gestión gratis y sin permanencia.",
  alternates: { canonical: "/llamada" },
};

/** Vídeo de venta: NEXT_PUBLIC_VIDEO_URL (Firebase Storage o CDN) o, si no está, /public/video. */
const VIDEO = { ...VIDEO_URLS, duration: "38 s" };

const GET = [
  {
    t: "Demanda real en tu ciudad",
    d: "Cuántas personas buscan hoy tus servicios en tu zona y cuántas solicitudes puedes captar cada mes.",
  },
  {
    t: "Coste por contacto cualificado",
    d: "Con la inversión que decidas, a qué precio puedes conseguir clientes con presupuesto real en mano.",
  },
  {
    t: "Hoja de ruta y mes de prueba",
    d: "Qué campañas y web montaríamos y cómo arrancar tu mes de gestión gratis. Si no es viable, te lo decimos con honestidad.",
  },
];

const AGENDA = [
  ["0–5 min", "Tu negocio hoy: sector, zona de actuación y qué capacidad tienes para atender nuevos trabajos."],
  ["5–15 min", "Oportunidad en tu ciudad: volumen de búsquedas, costes por contacto y cómo superar a tu competencia local."],
  ["15–20 min", "Plan de acción a medida y cómo activar tu primer mes de prueba sin permanencia ni ataduras."],
];

const REAL_CASES = [
  {
    badge: "Mudanzas & Logística",
    metric: "x15 de retorno",
    title: "11.800 € en presupuestos en Octubre 2026",
    desc: "52 contactos recibidos con solo 782 € de inversión publicitaria. El 83% fueron llamadas directas al teléfono de clientes listos para contratar.",
    client: "Mudanzas Palma · Valencia",
    url: "https://mudanzaspalma.es",
  },
  {
    badge: "Plataformas & Maquinaria",
    metric: "x2.8 llamadas",
    title: "Teléfono sonando para obras y particulares",
    desc: "Captación directa para alquiler de elevadores verticales en el momento exacto en que constructores y familias necesitan subir muebles o materiales.",
    client: "Plataformas La Terra · Valencia",
    url: "https://plataformaslaterra.es",
  },
  {
    badge: "Pintura & Decoración (UK)",
    metric: "-40% coste",
    title: "Clientes con vivienda y presupuesto real",
    desc: "Filtro previo en formularios para descartar curiosos y entregar solicitudes de proyectos de pintura integral y locales comerciales en Yorkshire.",
    client: "Mahonia Decor · Leeds, Reino Unido",
    url: "https://www.mahoniadecor.co.uk/",
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
  {
    image: "/images/team/ibai.webp",
    name: "Ibai",
    role: "Ingeniería de Software & Sistemas IA",
    bio: "Arquitectura cloud, desarrollo del área privada de clientes y motores de inteligencia artificial. Garantiza que cada lead se registre, se verifique y se notifique al instante en tu móvil con infraestructura robusta y segura.",
    focus: ["Ingeniería de software y cloud", "Área privada y CRM propio", "Automatización de leads e IA"],
  },
];

const FAQ = [
  {
    q: "¿Tiene algún coste o compromiso?",
    a: "Ninguno. Son 20 minutos sin coste. Analizamos los datos de tu zona y te quedas con la estrategia y los números independientemente de que trabajes con nosotros o no.",
  },
  {
    q: "¿Tengo que preparar algo antes de la videollamada?",
    a: "Solo tener claro qué servicios te interesa potenciar, en qué ciudades trabajas y si ya has invertido antes en publicidad. No hace falta preparar presentaciones ni informes.",
  },
  {
    q: "¿Quién me va a atender en la llamada?",
    a: "Hablas directamente con los socios fundadores de Estudio Digital Pro. Sin comerciales a comisión, sin intermediarios ni llamadas de venta agresiva.",
  },
  {
    q: "¿Cómo funciona el primer mes de prueba gratis?",
    a: "Diseñamos y montamos tu sistema completo: campañas, páginas de captación, medición y avisos inmediatos al móvil. Nuestra tarifa de gestión es 0 € durante 30 días; tú solo aportas la inversión que decidas para los anuncios.",
  },
  {
    q: "¿Hay permanencia después del mes de prueba?",
    a: "Cero permanencia. Si los clientes que te entran durante el primer mes cubren con creces la inversión y quieres continuar, seguimos trabajando mes a mes. Si decides no seguir, todo lo montado queda de tu propiedad.",
  },
  {
    q: "¿Y si prefiero preguntar algo antes por chat?",
    a: `Puedes escribirnos directamente por WhatsApp al ${CONTACT.phoneDisplay} y te contestamos de forma directa en minutos.`,
  },
];

export default function LlamadaPage() {
  const faqSchema = getFaqSchema(FAQ);
  const serviceSchema = getLlamadaServiceSchema();

  return (
    <>
      <LlamadaPageViewTracker />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <header className="lp-header">
        <div className="wrap lp-header-row">
          <a href="/" aria-label="Estudio Digital Pro, inicio">
            <Logo size={16} />
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <WhatsAppCta variant="badge" source="header_nav">
              WhatsApp
            </WhatsAppCta>
            <a href="#reservar" className="btn btn-ink lp-header-cta">
              Reservar llamada
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero con vídeo ───────────────────── */}
        <section className="lp-hero">
          <div className="wrap lp-hero-grid">
            <div className="lp-hero-copy">
              <Reveal>
                <p className="eyebrow">
                  <Scale score={5} size={6} gap={2} label="" /> 20 minutos con los fundadores · sin coste ni permanencia
                </p>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="display lp-h1">¿Cuántos clientes nuevos podrías captar en tu ciudad cada mes?</h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="lede">
                  En 20 minutos analizamos el volumen real de búsquedas de tu sector en tu zona geográfica y te mostramos
                  el plan exacto para captarlas. Si encaja, arrancas con tu <strong>primer mes de gestión gratis</strong>: solo pagas la publicidad.
                </p>
              </Reveal>
              <Reveal delay={240} className="lp-hero-ctas">
                <a href="#reservar" className="btn btn-accent">
                  Elegir día y hora <span className="arrow">→</span>
                </a>
                <WhatsAppCta source="hero_main">
                  Consultar por WhatsApp
                </WhatsAppCta>
                <span className="mono muted lp-hero-note">
                  Te llamamos nosotros · o llámanos al <a href={`tel:${CONTACT.phone}`}>{CONTACT.phoneDisplay}</a>
                </span>
              </Reveal>
              <Reveal delay={300}>
                <ul className="lp-proof">
                  <li>Primer mes de gestión gratis</li>
                  <li>Sin permanencia ni ataduras</li>
                  <li>Hablas con los socios fundadores</li>
                </ul>
              </Reveal>
            </div>
            <Reveal delay={200} className="lp-hero-video">
              <VideoPitch src={VIDEO.src} poster={VIDEO.poster} duration={VIDEO.duration} />
            </Reveal>
          </div>
        </section>

        {/* ── Casos reales / Métricas ──────────── */}
        <section className="lp-cases">
          <div className="wrap">
            <Reveal className="lp-cases-head">
              <p className="eyebrow">Resultados demostrables</p>
              <h2 className="display h2">Sistemas probados en empresas de servicios locales.</h2>
              <p className="lede muted" style={{ marginTop: "10px" }}>
                Campañas reales en sectores donde cada presupuesto ganado marca la diferencia en la facturación del mes.
              </p>
            </Reveal>
            <div className="lp-cases-grid">
              {REAL_CASES.map((c, i) => (
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

        {/* ── El Equipo de Socios Fundadores ──── */}
        <section className="lp-team">
          <div className="wrap">
            <Reveal className="lp-team-head">
              <p className="eyebrow">Equipo Fundador</p>
              <h2 className="display h2">Hablarás directamente con nosotros.</h2>
              <p className="lede muted" style={{ marginTop: "10px" }}>
                Sin teleoperadores ni comerciales a comisión. En la videollamada revisamos tu proyecto personas con experiencia
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
                <strong>Compromiso de honestidad:</strong> Si tras revisar tu mercado consideramos que nuestro sistema
                no va a ser rentable para tu negocio en tu ciudad, te lo diremos claramente en la llamada sin intentar venderte nada.
              </p>
              <a href="#reservar" className="btn btn-ink" style={{ flexShrink: 0 }}>
                Elegir fecha en el calendario →
              </a>
            </Reveal>
          </div>
        </section>

        {/* ── Reserva ──────────────────────────── */}
        <section id="reservar" className="section lp-book">
          <div className="wrap lp-book-grid">
            <div className="lp-book-copy">
              <Reveal>
                <p className="eyebrow">Reserva de llamada</p>
                <h2 className="display h2">Elige día y hora.</h2>
              </Reveal>
              <Reveal delay={100}>
                <p className="lede muted">Huecos de 20 minutos, de lunes a viernes. Confirmación inmediata en tu correo y WhatsApp.</p>
              </Reveal>
              <Reveal delay={160}>
                <ol className="lp-agenda">
                  {AGENDA.map(([t, d]) => (
                    <li key={t}>
                      <span className="mono tabular">{t}</span>
                      <p>{d}</p>
                    </li>
                  ))}
                </ol>
              </Reveal>

              {/* Opción de WhatsApp para tráfico móvil sin fricción */}
              <Reveal delay={200} className="lp-wa-box">
                <h4>¿Prefieres no agendar llamada todavía?</h4>
                <p>
                  Escríbenos directamente por WhatsApp indicando tu sector y ciudad. Te contestamos en minutos con un diagnóstico rápido.
                </p>
                <WhatsAppCta source="booking_side_box">
                  Escribir por WhatsApp ahora →
                </WhatsAppCta>
              </Reveal>
            </div>
            <Reveal delay={120}>
              <BookingCalendar />
            </Reveal>
          </div>
        </section>

        {/* ── Qué te llevas ────────────────────── */}
        <section className="lp-get">
          <div className="wrap">
            <div className="lp-get-grid">
              {GET.map((g, i) => (
                <Reveal key={g.t} delay={i * 90} className="lp-get-item">
                  <Scale score={i + 3} size={8} gap={2} label="" />
                  <h2 className="display h3">{g.t}</h2>
                  <p className="body-serif muted">{g.d}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────── */}
        <section className="section">
          <div className="wrap faq-grid">
            <Reveal>
              <p className="eyebrow">Antes de reservar</p>
              <h2 className="display h2">Dudas frecuentes.</h2>
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

        {/* ── CTA final ────────────────────────── */}
        <section className="lp-final dark">
          <div className="wrap lp-final-row">
            <div>
              <Scale score={5} size={18} gap={4} label="" />
              <h2 className="display h2">20 minutos. Cifras y estrategia, sin humo.</h2>
              <p className="body-serif muted" style={{ maxWidth: "560px", color: "var(--muted-dark)" }}>
                Descubre cuántos clientes potenciales hay en tu zona y cómo montar tu captación sin permanencia ni riesgos.
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <a href="#reservar" className="btn btn-accent">
                Reservar mi llamada <span className="arrow">→</span>
              </a>
              <WhatsAppCta source="footer_final">
                Preguntar por WhatsApp
              </WhatsAppCta>
            </div>
          </div>
        </section>
      </main>

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

      {/* Barra fija en móvil con Agenda + WhatsApp */}
      <StickyCta target="reservar">
        Reservar llamada de 20 min <span className="arrow">→</span>
      </StickyCta>
    </>
  );
}
