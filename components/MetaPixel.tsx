"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

export function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const [consented, setConsented] = useState<boolean>(false);

  useEffect(() => {
    if (!pixelId) return;

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
  }, [pixelId]);

  // Si no hay píxel configurado o el usuario no ha consentido cookies de marketing, no cargar nada
  if (!pixelId || !consented) return null;

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
