import type { Metadata } from "next";
import Link from "next/link";
import { Scale } from "@/components/Scale";
import { Logo } from "@/components/Logo";
import { CONTACT } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Auditoría en marcha · Estudio Digital Pro",
  description: "Hemos recibido tu solicitud de auditoría y mes de prueba. Nos ponemos a trabajar en tu caso.",
  robots: {
    index: false, // Las páginas de gracias no deben indexarse en Google
    follow: false,
  },
};

export default function AuditoriaGraciasPage() {
  return (
    <>
      <header className="site-header" style={{ position: "relative" }}>
        <div className="wrap header-bar">
          <Link href="/" className="header-logo" aria-label="Estudio Digital Pro, inicio">
            <Logo size={16} />
          </Link>
          <div className="header-actions">
            <Link href="/" className="btn btn-outline btn-sm">
              Volver a la web
            </Link>
          </div>
        </div>
      </header>

      <main style={{ minHeight: "75vh", display: "flex", alignItems: "center", padding: "64px 0" }}>
        <div className="wrap" style={{ maxWidth: "760px" }}>
          <div
            style={{
              border: "1px solid var(--line, #e2dfd9)",
              background: "var(--card-bg, #fff)",
              padding: "clamp(32px, 5vw, 64px)",
            }}
          >
            <div style={{ marginBottom: "24px" }}>
              <Scale score={5} size={20} gap={4} label="" />
            </div>

            <p className="eyebrow" style={{ color: "var(--accent, #e75623)", marginBottom: "12px" }}>
              Solicitud confirmada · Mes de prueba
            </p>

            <h1 className="display" style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.15, marginBottom: "20px" }}>
              Tu caso ya está sobre nuestra mesa.
            </h1>

            <p className="body-serif" style={{ fontSize: "18px", lineHeight: 1.6, color: "var(--body-color, #2c2822)", marginBottom: "16px" }}>
              Hemos registrado los datos de tu empresa. El fundador revisará personalmente la competencia en tu zona,
              los costes por lead actuales y el canal más rentable antes de responderte.
            </p>

            <p className="body-serif" style={{ fontSize: "16px", lineHeight: 1.6, color: "var(--muted, #6f6a61)", marginBottom: "32px" }}>
              En menos de <strong>24 horas laborables</strong> recibirás un correo con la propuesta clara y la fecha
              exacta para arrancar tu primer mes de gestión sin honorarios.
            </p>

            <div
              style={{
                background: "var(--bg-subtle, #f6f5f1)",
                borderLeft: "3px solid var(--accent, #e75623)",
                padding: "20px 24px",
                marginBottom: "36px",
              }}
            >
              <h2 className="display" style={{ fontSize: "16px", marginBottom: "8px" }}>
                ¿Tienes urgencia o prefieres comentarlo en directo?
              </h2>
              <p style={{ fontSize: "14px", lineHeight: 1.5, color: "var(--muted, #6f6a61)", marginBottom: "16px" }}>
                Puedes elegir directamente un hueco en nuestra agenda para una llamada de 20 minutos hoy o mañana.
              </p>
              <Link href="/llamada" className="btn btn-ink" style={{ display: "inline-block" }}>
                Agendar llamada de 20 min →
              </Link>
            </div>

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
              <Link href="/" className="link" style={{ fontSize: "14px" }}>
                ← Volver al inicio
              </Link>
              <span style={{ color: "var(--line, #e2dfd9)" }}>|</span>
              <a href={`tel:${CONTACT.phone}`} className="link" style={{ fontSize: "14px" }}>
                O llámanos directamente al {CONTACT.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
