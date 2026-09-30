import "./llamada.css";
import type { Metadata } from "next";
import { BookingCalendar } from "@/components/BookingCalendar";
import { VideoPitch } from "@/components/VideoPitch";
import { Reveal } from "@/components/Reveal";
import { Scale } from "@/components/Scale";
import { Logo } from "@/components/Logo";
import { StickyCta } from "@/components/StickyCta";
import { ClientAreaShowcase } from "@/components/ClientAreaShowcase";
import { CONTACT, VIDEO as VIDEO_URLS } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Reserva una llamada de 20 minutos · Estudio Digital Pro",
  description:
    "20 minutos con el fundador para ver cuántos clientes se te escapan y qué cambiaríamos. Si encaja, primer mes de gestión gratis y sin permanencia.",
  alternates: { canonical: "/llamada" },
};

/** Vídeo de venta: NEXT_PUBLIC_VIDEO_URL (Firebase Storage o CDN) o, si no está, /public/video. */
const VIDEO = { ...VIDEO_URLS, duration: "1 min" };

const GET = [
  {
    t: "Dónde se te escapan clientes",
    d: "Qué canales, anuncios o respuestas lentas hacen que un cliente potencial acabe en la competencia.",
  },
  {
    t: "Cuánto te cuesta cada contacto",
    d: "Con lo que inviertes hoy, cuánto pagas por cada cliente potencial que de verdad podía contratarte.",
  },
  {
    t: "Un plan y tu mes de prueba",
    d: "Qué haríamos y cuándo arrancar. Si no encajamos, te lo decimos en la llamada.",
  },
];

const AGENDA = [
  ["0–5 min", "Cómo captas clientes hoy: canales, inversión y qué pasa con cada contacto."],
  ["5–15 min", "Miramos tus números y dónde se pierde el presupuesto."],
  ["15–20 min", "Qué cambiaríamos y cómo arrancar tu mes de gestión gratis."],
];

const FAQ = [
  {
    q: "¿Tiene algún coste?",
    a: "No. Son 20 minutos sin compromiso. Si al final no encajamos, te quedas con el diagnóstico igualmente.",
  },
  {
    q: "¿Tengo que preparar algo?",
    a: "Basta con saber cuánto inviertes al mes en anuncios y cuántos contactos te llegan. Si tienes acceso a tus cuentas de Google o Meta, mejor, pero no es obligatorio.",
  },
  {
    q: "¿Quién me llama?",
    a: "El fundador de Estudio Digital Pro. Nada de call center ni comerciales. Te llamamos al teléfono que nos dejes, a la hora que elijas.",
  },
  {
    q: "¿Y si encaja?",
    a: "Arrancamos tu mes de prueba: montamos campañas, web y avisos, y la gestión corre de nuestra cuenta. Solo pagas la publicidad. Sin permanencia ni contratos atados.",
  },
  {
    q: "¿Y si necesito cambiar la hora?",
    a: `Responde al correo de confirmación, escríbenos a ${CONTACT.email} o llámanos al ${CONTACT.phoneDisplay} y la movemos.`,
  },
];

export default function LlamadaPage() {
  return (
    <>
      <header className="lp-header">
        <div className="wrap lp-header-row">
          <a href="/" aria-label="Estudio Digital Pro, inicio">
            <Logo size={16} />
          </a>
          <a href="#reservar" className="btn btn-ink lp-header-cta">
            Reservar llamada
          </a>
        </div>
      </header>

      <main>
        {/* ── Hero con vídeo ───────────────────── */}
        <section className="lp-hero">
          <div className="wrap lp-hero-grid">
            <div className="lp-hero-copy">
              <Reveal>
                <p className="eyebrow">
                  <Scale score={5} size={6} gap={2} label="" /> 20 minutos con el fundador · sin coste
                </p>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="display lp-h1">¿Cuántos clientes se te escapan cada mes?</h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="lede">
                  En 20 minutos miramos cómo captas clientes hoy y te decimos qué cambiaríamos. Si encaja, arrancas
                  con un mes de gestión gratis: solo pagas la publicidad.
                </p>
              </Reveal>
              <Reveal delay={240} className="lp-hero-ctas">
                <a href="#reservar" className="btn btn-accent">
                  Elegir día y hora <span className="arrow">→</span>
                </a>
                <span className="mono muted lp-hero-note">
                  Te llamamos nosotros · o llama al <a href={`tel:${CONTACT.phone}`}>{CONTACT.phoneDisplay}</a>
                </span>
              </Reveal>
              <Reveal delay={300}>
                <ul className="lp-proof">
                  <li>Primer mes de gestión gratis</li>
                  <li>Sin permanencia</li>
                  <li>Hablas con el fundador</li>
                </ul>
              </Reveal>
            </div>
            <Reveal delay={200} className="lp-hero-video">
              <VideoPitch src={VIDEO.src} poster={VIDEO.poster} duration={VIDEO.duration} />
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

        {/* ── Reserva ──────────────────────────── */}
        <section id="reservar" className="section lp-book">
          <div className="wrap lp-book-grid">
            <div className="lp-book-copy">
              <Reveal>
                <p className="eyebrow">Reserva</p>
                <h2 className="display h2">Elige día y hora.</h2>
              </Reveal>
              <Reveal delay={100}>
                <p className="lede muted">Huecos de 20 minutos, de lunes a viernes. Te confirmamos al momento.</p>
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
            </div>
            <Reveal delay={120}>
              <BookingCalendar />
            </Reveal>
          </div>
        </section>

        {/* ── Por qué nosotros ─────────────────── */}
        <section className="section dark lp-why">
          <div className="wrap lp-why-grid">
            <Reveal>
              <p className="eyebrow">Cómo trabajamos</p>
              <h2 className="display h2">No clics, no promesas: sistemas que convierten.</h2>
            </Reveal>
            <div className="lp-why-list">
              {[
                ["Apareces donde te buscan", "Google Local Services, Google Ads, Meta y TikTok, en el momento en que alguien necesita tu servicio."],
                ["Te avisamos en minutos", "Cada formulario o llamada te llega al móvil al instante. Ningún cliente potencial se enfría."],
                ["Tú pones la nota, el algoritmo aprende", "Con un toque calificas cada contacto y esa señal vuelve a la plataforma: cada mes, más contactos buenos."],
                ["Lo ves todo", "Informes, reuniones e incidencias en tu área de cliente. Transparencia total."],
              ].map(([t, d], i) => (
                <Reveal key={t} delay={i * 90} className="lp-why-item">
                  <span className="mono tabular muted">0{i + 1}</span>
                  <div>
                    <h3 className="display h3">{t}</h3>
                    <p className="body-serif muted">{d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Área de clientes ────────────────── */}
        <ClientAreaShowcase />

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
              <h2 className="display h2">20 minutos. Cifras, no humo.</h2>
            </div>
            <a href="#reservar" className="btn btn-accent">
              Reservar mi llamada <span className="arrow">→</span>
            </a>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="wrap footer-legal">
          <span>© {new Date().getFullYear()} Estudio Digital Pro</span>
          <span className="lp-footer-contact">
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            <a href={`tel:${CONTACT.phone}`}>{CONTACT.phoneDisplay}</a>
          </span>
        </div>
      </footer>

      {/* Barra fija en móvil */}
      <StickyCta target="reservar">
        Reservar llamada de 20 min <span className="arrow">→</span>
      </StickyCta>
    </>
  );
}
