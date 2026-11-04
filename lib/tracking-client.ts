"use client";

import { getAttributionPayload } from "@/lib/attribution-client";

/**
 * Envío unificado y deduplicado de eventos a Meta (Pixel en navegador + Conversions API en servidor).
 * Utiliza el mismo eventId para que Meta deduplique si ambos canales disparan el evento.
 */
export function trackEvent(eventName: string, customData?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  const eventId = `ev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const attribution = getAttributionPayload();
  const url = window.location.href;

  // 1. Envío al Meta Pixel en el navegador si está disponible
  const w = window as unknown as { fbq?: Function; gtag?: Function };
  if (typeof w.fbq === "function") {
    try {
      w.fbq("trackCustom", eventName, customData || {}, { eventID: eventId });
    } catch {
      // Ignorar errores del script de terceros
    }
  }

  // 2. Envío a Google Ads / GA4 si está configurado
  if (typeof w.gtag === "function") {
    try {
      w.gtag("event", eventName.toLowerCase(), customData || {});
    } catch {
      // Ignorar
    }
  }

  // 3. Envío redundante al servidor (Meta CAPI) para no perder eventos por ad blockers o cookie banners
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        eventId,
        eventSourceUrl: url,
        attribution,
        customData,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Silencioso
  }
}

