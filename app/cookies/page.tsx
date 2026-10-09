import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Política de Cookies · Estudio Digital Pro",
  description: "Información técnica sobre las cookies utilizadas en Estudio Digital Pro y cómo gestionar tus preferencias.",
  alternates: {
    canonical: "/cookies",
  },
};

export default function CookiesPage() {
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
            Transparencia · ePrivacy
          </p>

          <h1 className="display" style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.15, marginBottom: "32px" }}>
            Política de Cookies
          </h1>

          <div
            className="body-serif"
            style={{
              fontSize: "16px",
              lineHeight: 1.7,
              color: "var(--body-color, #2c2822)",
              display: "flex",
              flexDirection: "column",
              gap: "28px",
            }}
          >
            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                1. ¿Qué son las cookies?
              </h2>
              <p>
                Una cookie es un pequeño archivo de texto que los sitios web descargan en tu navegador u ordenador cuando los visitas.
                Se utilizan ampliamente para hacer que los sitios web funcionen de manera eficiente y segura, así como para proporcionar
                información analítica y de medición a los propietarios del sitio.
              </p>
            </section>

            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                2. Cookies utilizadas en este sitio web
              </h2>
              <p>
                A continuación se detallan de forma exhaustiva las cookies empleadas en este portal:
              </p>

              <div style={{ overflowX: "auto", marginTop: "16px" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "14px",
                    textAlign: "left",
                    border: "1px solid var(--line, #e2dfd9)",
                  }}
                >
                  <thead>
                    <tr style={{ background: "var(--bg-subtle, #f6f5f1)", borderBottom: "1px solid var(--line, #e2dfd9)" }}>
                      <th style={{ padding: "10px 12px" }}>Cookie</th>
                      <th style={{ padding: "10px 12px" }}>Tipo</th>
                      <th style={{ padding: "10px 12px" }}>Titular</th>
                      <th style={{ padding: "10px 12px" }}>Finalidad</th>
                      <th style={{ padding: "10px 12px" }}>Duración</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid var(--line, #e2dfd9)" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono, monospace)" }}>edp_cookie_consent</td>
                      <td style={{ padding: "10px 12px" }}>Técnica</td>
                      <td style={{ padding: "10px 12px" }}>Propia</td>
                      <td style={{ padding: "10px 12px" }}>Guarda la elección de cookies del usuario.</td>
                      <td style={{ padding: "10px 12px" }}>1 año</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--line, #e2dfd9)" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono, monospace)" }}>_GRECAPTCHA</td>
                      <td style={{ padding: "10px 12px" }}>Seguridad</td>
                      <td style={{ padding: "10px 12px" }}>Google LLC</td>
                      <td style={{ padding: "10px 12px" }}>Protección contra spam y bots automatizados en formularios.</td>
                      <td style={{ padding: "10px 12px" }}>6 meses</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--line, #e2dfd9)" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono, monospace)" }}>_fbp</td>
                      <td style={{ padding: "10px 12px" }}>Marketing / Analítica</td>
                      <td style={{ padding: "10px 12px" }}>Meta Platforms</td>
                      <td style={{ padding: "10px 12px" }}>Almacena un identificador único de navegador para atribución publicitaria (solo si se consiente).</td>
                      <td style={{ padding: "10px 12px" }}>90 días</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono, monospace)" }}>_fbc</td>
                      <td style={{ padding: "10px 12px" }}>Marketing / Atribución</td>
                      <td style={{ padding: "10px 12px" }}>Meta Platforms</td>
                      <td style={{ padding: "10px 12px" }}>Vincula la visita con un clic en un anuncio de Meta (fbclid) para medir la conversión (solo si se consiente).</td>
                      <td style={{ padding: "10px 12px" }}>90 días</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                3. Cómo deshabilitar o eliminar las cookies
              </h2>
              <p>
                Puedes permitir, bloquear o eliminar las cookies instaladas en tu equipo mediante la configuración de las opciones de tu navegador web:
              </p>
              <ul style={{ paddingLeft: "20px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <li><strong>Google Chrome:</strong> Configuración &gt; Privacidad y seguridad &gt; Cookies y otros datos de sitios.</li>
                <li><strong>Mozilla Firefox:</strong> Ajustes &gt; Privacidad y seguridad &gt; Cookies y datos del sitio.</li>
                <li><strong>Apple Safari:</strong> Ajustes &gt; Safari &gt; Privacidad y seguridad &gt; Bloquear todas las cookies.</li>
                <li><strong>Microsoft Edge:</strong> Configuración &gt; Permisos del sitio &gt; Cookies y datos del sitio.</li>
              </ul>
            </section>
          </div>

          <div style={{ marginTop: "48px", borderTop: "1px solid var(--line, #e2dfd9)", paddingTop: "24px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <Link href="/" className="link" style={{ fontSize: "14px" }}>
              ← Volver al sitio principal
            </Link>
            <span style={{ color: "var(--line, #e2dfd9)" }}>|</span>
            <Link href="/privacidad" className="link" style={{ fontSize: "14px" }}>
              Política de Privacidad
            </Link>
            <span style={{ color: "var(--line, #e2dfd9)" }}>|</span>
            <Link href="/aviso-legal" className="link" style={{ fontSize: "14px" }}>
              Aviso Legal
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
