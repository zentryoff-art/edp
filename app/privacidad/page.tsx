import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CONTACT } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Política de Privacidad y Cookies · Estudio Digital Pro",
  description: "Información transparente sobre el tratamiento de datos personales, cookies y medición de campañas en Estudio Digital Pro.",
  alternates: {
    canonical: "/privacidad",
  },
};

export default function PrivacidadPage() {
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

      <main style={{ padding: "64px 0", minHeight: "80vh" }}>
        <div className="wrap" style={{ maxWidth: "800px" }}>
          <p className="eyebrow" style={{ color: "var(--accent, #e75623)", marginBottom: "12px" }}>
            Legal · RGPD & ePrivacy
          </p>

          <h1 className="display" style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.15, marginBottom: "32px" }}>
            Política de Privacidad y Tratamiento de Datos
          </h1>

          <div className="body-serif" style={{ fontSize: "16px", lineHeight: 1.7, color: "var(--body-color, #2c2822)", display: "flex", flexDirection: "column", gap: "24px" }}>
            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                1. Responsable del tratamiento
              </h2>
              <p>
                El responsable del tratamiento de los datos recabados a través de este sitio web es{" "}
                <strong>Estudio Digital Pro</strong>, con correo de contacto{" "}
                <a href={`mailto:${CONTACT.email}`} className="link">{CONTACT.email}</a> y teléfono de atención{" "}
                <a href={`tel:${CONTACT.phone}`} className="link">{CONTACT.phoneDisplay}</a>.
              </p>
            </section>

            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                2. Datos recopilados y finalidad
              </h2>
              <p>
                Tratamos los datos que nos facilitas voluntariamente a través del formulario de auditoría y de la reserva de llamadas (nombre, empresa, correo electrónico, teléfono, sector y notas) con las siguientes finalidades:
              </p>
              <ul style={{ paddingLeft: "20px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <li>Elaborar y remitir la auditoría de captación y la propuesta comercial solicitada.</li>
                <li>Agendar y confirmar la llamada de diagnóstico de 20 minutos.</li>
                <li>Prestar los servicios contratados a través del área de clientes en caso de formalizar la relación.</li>
              </ul>
            </section>

            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                3. Base jurídica del tratamiento
              </h2>
              <p>
                La base legal para el tratamiento de tus datos es la aplicación de medidas precontractuales o contractuales a tu petición expresa (art. 6.1.b del RGPD) y el consentimiento explícito otorgado al enviar los formularios de contacto o al aceptar las cookies analíticas.
              </p>
            </section>

            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                4. Medición de campañas y cesión seudonimizada (Meta Platforms)
              </h2>
              <p>
                Para medir y optimizar la efectividad de nuestras campañas publicitarias en Meta Ads (Facebook e Instagram), utilizamos tecnologías de medición como el Meta Pixel y la API de Conversiones de Meta (Conversions API).
              </p>
              <p>
                Al confirmar una solicitud o reserva, pueden transmitirse a Meta Platforms Ireland Ltd. datos técnicos seudonimizados mediante algoritmos unidireccionales de cifrado (hash SHA-256 de email o teléfono, dirección IP y agentes de usuario), con el único fin de atribuir la conversión publicitaria. Estos datos no son utilizados por Meta para otros fines sin tu consentimiento.
              </p>
            </section>

            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                5. Política de cookies
              </h2>
              <p>
                Este sitio web utiliza cookies técnicas estrictamente necesarias para el funcionamiento y seguridad de la plataforma (como Google reCAPTCHA v3 para protección contra spam automatizado).
              </p>
              <p>
                Las cookies analíticas y de marketing de terceros solo se activan si pulsas expresamente &quot;Aceptar todas&quot; en nuestro banner de consentimiento. Puedes modificar o revocar tu consentimiento en cualquier momento eliminando las cookies de tu navegador.
              </p>
            </section>

            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                6. Tus derechos
              </h2>
              <p>
                Puedes ejercer en cualquier momento tus derechos de acceso, rectificación, supresión, limitación del tratamiento, portabilidad y oposición dirigiéndote por correo electrónico a{" "}
                <a href={`mailto:${CONTACT.email}`} className="link">{CONTACT.email}</a>.
              </p>
            </section>
          </div>

          <div style={{ marginTop: "48px", borderTop: "1px solid var(--line, #e2dfd9)", paddingTop: "24px" }}>
            <Link href="/" className="link" style={{ fontSize: "14px" }}>
              ← Volver al sitio principal
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
