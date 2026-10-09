import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getLegalConfig } from "@/lib/legal-config";

export const metadata: Metadata = {
  title: "Aviso Legal · Estudio Digital Pro",
  description: "Información legal del prestador del servicio y condiciones de uso del sitio web según la Ley 34/2002 (LSSI-CE).",
  alternates: {
    canonical: "/aviso-legal",
  },
};

export default async function AvisoLegalPage() {
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
            Información legal · LSSI-CE
          </p>

          <h1 className="display" style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.15, marginBottom: "32px" }}>
            Aviso Legal
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
                1. Datos identificativos del prestador (Art. 10 LSSI-CE)
              </h2>
              <p>
                En cumplimiento del deber de información establecido en el artículo 10 de la Ley 34/2002, de 11 de julio,
                de Servicios de la Sociedad de la Información y del Comercio Electrónico (LSSI-CE), se facilitan a continuación
                los datos del titular y prestador del servicio:
              </p>
              <div
                style={{
                  background: "var(--bg-subtle, #f6f5f1)",
                  borderLeft: "3px solid var(--accent, #e75623)",
                  padding: "16px 20px",
                  marginTop: "12px",
                  fontSize: "15px",
                }}
              >
                <p style={{ margin: "4px 0" }}><strong>Titular / Razón Social:</strong> {legal.holderName}</p>
                <p style={{ margin: "4px 0" }}><strong>Nombre Comercial:</strong> {legal.tradeName}</p>
                <p style={{ margin: "4px 0" }}><strong>NIF / CIF:</strong> {legal.taxId}</p>
                <p style={{ margin: "4px 0" }}><strong>Domicilio fiscal:</strong> {legal.address}</p>
                <p style={{ margin: "4px 0" }}>
                  <strong>Correo electrónico de contacto:</strong>{" "}
                  <a href={`mailto:${legal.email}`} className="link">{legal.email}</a>
                </p>
                <p style={{ margin: "4px 0" }}>
                  <strong>Teléfono de atención:</strong>{" "}
                  <a href={`tel:${legal.phone}`} className="link">{legal.phoneDisplay}</a>
                </p>
                {legal.registryDetails && (
                  <p style={{ margin: "4px 0" }}><strong>Datos registrales:</strong> {legal.registryDetails}</p>
                )}
              </div>
            </section>

            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                2. Objeto y ámbito de aplicación
              </h2>
              <p>
                El presente Aviso Legal regula el acceso, navegación y uso del sitio web ubicado en el dominio{" "}
                <strong>estudiodigitalpro.com</strong> y sus subdominios asociados (incluyendo <strong>app.estudiodigitalpro.com</strong>).
                El acceso a esta web atribuye la condición de usuario e implica la aceptación plena y sin reservas de todas las disposiciones
                incluidas en este documento.
              </p>
            </section>

            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                3. Condiciones de uso y responsabilidad
              </h2>
              <p>
                El usuario se compromete a hacer un uso adecuado, ético y lícito de los contenidos, herramientas y servicios ofrecidos
                a través del sitio web. Queda expresamente prohibido el empleo de este portal para actividades ilícitas, fraudulentas,
                lesivas de derechos e intereses de terceros, o que puedan sobrecargar, dañar o inutilizar las redes y servidores del titular.
              </p>
            </section>

            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                4. Propiedad intelectual e industrial
              </h2>
              <p>
                Todos los contenidos del sitio web —incluyendo de forma enunciativa pero no limitativa textos, metodologías de captación,
                diseños gráficos, logotipos, marcas comerciales, código fuente, interfaz visual del portal de clientes y arquitectura
                de software— son titularidad exclusiva de <strong>{legal.tradeName}</strong> o de terceros licenciantes legítimos,
                estando protegidos por la legislación española e internacional sobre propiedad intelectual e industrial.
              </p>
              <p>
                Queda expresamente prohibida la reproducción total o parcial, explotación, distribución o transformación de dichos contenidos
                sin la previa autorización expresa y por escrito del titular.
              </p>
            </section>

            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                5. Exclusión de garantías y limitación de responsabilidad
              </h2>
              <p>
                El titular realiza los máximos esfuerzos para garantizar la disponibilidad técnica y la exactitud de la información mostrada.
                No obstante, no se hace responsable de posibles interrupciones temporales del servicio debidas a labores de mantenimiento,
                caídas de proveedores externos o incidencias fortuitas ajenas a su control razonable.
              </p>
            </section>

            <section>
              <h2 className="display" style={{ fontSize: "20px", marginBottom: "12px" }}>
                6. Legislación aplicable y jurisdicción
              </h2>
              <p>
                Las relaciones entre el prestador y los usuarios se regirán por la normativa española vigente. Para la resolución de cualquier
                discrepancia o controversia derivada de la interpretación o ejecución del presente aviso, las partes se someten expresamente a los
                Juzgados y Tribunales de la ciudad del domicilio social del prestador, con renuncia a cualquier otro fuero que pudiera corresponderles.
              </p>
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
            <Link href="/terminos" className="link" style={{ fontSize: "14px" }}>
              Términos del Servicio
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
