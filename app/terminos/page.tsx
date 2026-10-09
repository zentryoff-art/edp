import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getLegalConfig } from "@/lib/legal-config";

export const metadata: Metadata = {
  title: "Términos y Condiciones del Servicio · Estudio Digital Pro",
  description: "Condiciones de contratación, alcance de la gestión publicitaria y regulación del mes de prueba sin honorarios.",
  alternates: {
    canonical: "/terminos",
  },
};

export default async function TerminosPage() {
  const legal = await getLegalConfig();

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
            Contratación · Servicios B2B
          </p>

          <h1 className="display" style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.15, marginBottom: "32px" }}>
            Términos y Condiciones del Servicio
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
                1. Partes y objeto del contrato
              </h2>
              <p>
                Los presentes Términos y Condiciones regulan la prestación de servicios profesionales de captación digital de clientes,
                auditoría comercial, configuración técnica de campañas publicitarias y acceso al portal de clientes provistos por{" "}
                <strong>{legal.holderName}</strong> (en adelante, <strong>{legal.tradeName}</strong> o &quot;la Agencia&quot;) a favor de
                empresas, profesionales independientes y pymes de servicios (en adelante, &quot;el Cliente&quot;).
              </p>
            </section>

            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                2. Régimen del primer mes de gestión sin honorarios (&quot;Mes de prueba&quot;)
              </h2>
              <p>
                Para nuevos clientes cualificados, la Agencia ofrece un periodo inicial de prueba de hasta treinta (30) días naturales
                bajo las siguientes condiciones estrictas de transparencia:
              </p>
              <ul style={{ paddingLeft: "20px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <li>
                  <strong>Honorarios de gestión 0 €:</strong> Durante este primer periodo de 30 días, la Agencia no cobrará cuota fija ni
                  honorarios por la estrategia, diseño de creativos, redacción de anuncios, optimización y soporte técnico.
                </li>
                <li>
                  <strong>Inversión en medios publicitarios:</strong> El presupuesto destinado a la compra de clics o leads (Google Ads,
                  Google Local Services Ads, Meta Ads) es abonado directa e íntegramente por el Cliente a las respectivas plataformas
                  mediante su propio método de pago y facturación.
                </li>
                <li>
                  <strong>Propiedad absoluta de las cuentas y datos:</strong> Las cuentas publicitarias, las fichas verificadas, los activos
                  digitales y la totalidad de los datos de los clientes potenciales (leads) captados pertenecen al Cliente en todo momento.
                </li>
                <li>
                  <strong>Sin permanencia:</strong> Finalizado el periodo de prueba, el Cliente decide con total libertad si desea continuar
                  contratando el servicio mensual de la Agencia o pausarlo, sin penalizaciones ni ataduras contractuales.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                3. Obligaciones y colaboración del Cliente
              </h2>
              <p>
                Para maximizar los resultados de captación comercial, el Cliente se compromete a:
              </p>
              <ul style={{ paddingLeft: "20px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <li>Atender con la debida diligencia y rapidez las llamadas y mensajes de los prospectos recibidos.</li>
                <li>Facilitar la información técnica, zonas de cobertura y precios requeridos para configurar las campañas.</li>
                <li>Calificar los leads en el área de clientes para permitir a los algoritmos de la Agencia optimizar las conversiones.</li>
              </ul>
            </section>

            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                4. Confidencialidad y seguridad de datos
              </h2>
              <p>
                Ambas partes se obligan a mantener estricta confidencialidad sobre los datos comerciales, métricas de negocio, estrategias y
                know-how intercambiados durante la prestación del servicio. Los datos de contacto recibidos son tratados bajo el estricto
                cumplimiento del RGPD y la normativa española de protección de datos.
              </p>
            </section>

            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                5. Facturación y continuidad del servicio
              </h2>
              <p>
                En caso de que el Cliente decida formalizar la continuidad tras el periodo de prueba gratuito, la Agencia emitirá la propuesta
                comercial correspondiente detallando la cuota de gestión pactada, que se facturará mensualmente por adelantado.
              </p>
            </section>

            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                6. Jurisdicción y ley aplicable
              </h2>
              <p>
                La relación comercial se rige por el ordenamiento jurídico español. Para cualquier discrepancia o reclamación, las partes
                acuerdan someterse a los Juzgados y Tribunales de la ciudad del domicilio social de la Agencia ({legal.address.split(",")[0] || "Madrid"}).
              </p>
            </section>
          </div>

          <div style={{ marginTop: "48px", borderTop: "1px solid var(--line, #e2dfd9)", paddingTop: "24px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <Link href="/" className="link" style={{ fontSize: "14px" }}>
              ← Volver al sitio principal
            </Link>
            <span style={{ color: "var(--line, #e2dfd9)" }}>|</span>
            <Link href="/aviso-legal" className="link" style={{ fontSize: "14px" }}>
              Aviso Legal
            </Link>
            <span style={{ color: "var(--line, #e2dfd9)" }}>|</span>
            <Link href="/privacidad" className="link" style={{ fontSize: "14px" }}>
              Política de Privacidad
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
