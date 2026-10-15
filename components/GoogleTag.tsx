"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

/**
 * Componente oficial de Google Tag (Google Ads / GA4).
 * Funciona de forma condicional: solo se carga si se configura NEXT_PUBLIC_GOOGLE_TAG_ID
 * y el usuario ha aceptado las cookies de analítica/marketing en el CookieBanner.
 */
export function GoogleTag() {
  const tagId = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID;
  const [consented, setConsented] = useState<boolean>(false);

  useEffect(() => {
    if (!tagId) return;

    // Comprobar consentimiento previo
    const checkConsent = () => {
      const val = localStorage.getItem("edp_cookie_consent");
      if (val === "all") {
        setConsented(true);
      }
    };

    checkConsent();

    // Escuchar cambios de consentimiento desde el CookieBanner
    const onConsentUpdated = () => checkConsent();
    window.addEventListener("edp_consent_updated", onConsentUpdated);
    return () => window.removeEventListener("edp_consent_updated", onConsentUpdated);
  }, [tagId]);

  // Si no hay ID configurado o el usuario no ha consentido, no descargar scripts de Google
  if (!tagId || !consented) return null;

  return (
    <>
      <Script
        id="google-tag-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${tagId}`}
      />
      <Script
        id="google-tag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${tagId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

/** Dispara un evento de conversión de Google Ads si el tag está cargado */
export function trackGoogleConversion(sendTo?: string) {
  if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
    (window as any).gtag("event", "conversion", {
      send_to: sendTo,
    });
  }
}
