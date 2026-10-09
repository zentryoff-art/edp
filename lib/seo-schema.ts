import { CONTACT } from "./contact";

/**
 * Esquema estructurado global para Estudio Digital Pro (Organization + ProfessionalService + WebSite).
 */
export function getOrganizationSchema() {
  const baseUrl = CONTACT.site;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "ProfessionalService"],
        "@id": `${baseUrl}/#organization`,
        name: "Estudio Digital Pro",
        url: baseUrl,
        logo: `${baseUrl}/icons/icon-512x512.png`,
        image: `${baseUrl}/icons/icon-512x512.png`,
        description:
          "Agencia de captación de clientes para pymes de servicios mediante Google Local Services Ads, Google Ads y Meta Ads. Primer mes de gestión gratis.",
        telephone: CONTACT.phone,
        email: CONTACT.email,
        address: {
          "@type": "PostalAddress",
          addressCountry: "ES",
        },
        areaServed: {
          "@type": "Country",
          name: "España",
        },
        priceRange: "€€",
        currenciesAccepted: "EUR",
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            opens: "09:00",
            closes: "19:00",
          },
        ],
        knowsAbout: [
          "Google Local Services Ads",
          "Google Ads",
          "Meta Ads",
          "Generación de leads cualificados",
          "Captación de clientes para pymes",
          "Publicidad digital para servicios",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: baseUrl,
        name: "Estudio Digital Pro",
        publisher: {
          "@id": `${baseUrl}/#organization`,
        },
        inLanguage: "es-ES",
      },
    ],
  };
}

/**
 * Esquema FAQPage para resultados enriquecidos en Google Search.
 */
export function getFaqSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

/**
 * Esquema Service para la llamada de diagnóstico estratégico.
 */
export function getLlamadaServiceSchema() {
  const baseUrl = CONTACT.site;

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${baseUrl}/llamada#service`,
    name: "Llamada de Diagnóstico y Plan de Captación (20 min)",
    serviceType: "Consultoría de captación de clientes",
    description:
      "Diagnóstico estratégico de 20 minutos con el fundador para analizar canales de adquisición, coste por contacto y plan de mes de prueba gratuito.",
    provider: {
      "@id": `${baseUrl}/#organization`,
    },
    areaServed: {
      "@type": "Country",
      name: "España",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Diagnóstico gratuito sin compromiso ni permanencia.",
    },
  };
}
