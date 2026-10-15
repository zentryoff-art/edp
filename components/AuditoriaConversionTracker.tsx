"use client";

import { useEffect } from "react";

/**
 * Disparador silencioso de eventos de conversión en el navegador para Meta y Google Ads
 * cuando el usuario aterriza en la página de éxito de auditoría (/auditoria/gracias).
 */
export function AuditoriaConversionTracker() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const w = window as unknown as { fbq?: Function; gtag?: Function };
      if (typeof w.fbq === "function") {
        w.fbq("track", "Lead", {
          content_name: "Solicitud mes de prueba",
        });
      }
      if (typeof w.gtag === "function") {
        w.gtag("event", "conversion", {
          event_category: "lead",
          event_label: "Solicitud mes de prueba",
        });
      }
    }
  }, []);

  return null;
}
