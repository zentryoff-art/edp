/**
 * Captura y persistencia de parámetros de atribución (Meta Ads, Google Ads, UTMs).
 * Funciona de forma silenciosa en el frontend sin dependencias externas.
 */

export interface AttributionPayload {
  fbclid?: string;
  fbp?: string;
  fbc?: string;
  gclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_url?: string;
  referrer?: string;
  captured_at?: string;
}

const STORAGE_KEY = "edp_attr_v1";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1")}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function setCookie(name: string, value: string, days = 90) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

/**
 * Inicializa la captura de atribución en la página actual.
 * Detecta parámetros de URL, sincroniza cookies _fbp y _fbc, y persiste en sessionStorage.
 */
export function captureAttribution(): AttributionPayload {
  if (typeof window === "undefined") return {};

  let stored: AttributionPayload = {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch {
    stored = {};
  }

  const url = new URL(window.location.href);
  const fbclid = url.searchParams.get("fbclid") || stored.fbclid;
  const gclid = url.searchParams.get("gclid") || stored.gclid;
  const utm_source = url.searchParams.get("utm_source") || stored.utm_source;
  const utm_medium = url.searchParams.get("utm_medium") || stored.utm_medium;
  const utm_campaign = url.searchParams.get("utm_campaign") || stored.utm_campaign;
  const utm_content = url.searchParams.get("utm_content") || stored.utm_content;
  const utm_term = url.searchParams.get("utm_term") || stored.utm_term;

  // ── Gestión de cookies de Meta (_fbp y _fbc) ──
  let fbp = getCookie("_fbp") || stored.fbp;
  if (!fbp) {
    // Generar formato estándar Meta: fb.1.{timestamp}.{random}
    fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 8999999999 + 1000000000)}`;
    try {
      setCookie("_fbp", fbp, 90);
    } catch {
      // Ignorar si cookies restringidas
    }
  }

  let fbc = getCookie("_fbc") || stored.fbc;
  if (!fbc && fbclid) {
    // Generar formato estándar Meta para Click ID: fb.1.{timestamp}.{fbclid}
    fbc = `fb.1.${Date.now()}.${fbclid}`;
    try {
      setCookie("_fbc", fbc, 90);
    } catch {
      // Ignorar si cookies restringidas
    }
  }

  const payload: AttributionPayload = {
    fbclid: fbclid || undefined,
    fbp: fbp || undefined,
    fbc: fbc || undefined,
    gclid: gclid || undefined,
    utm_source: utm_source || undefined,
    utm_medium: utm_medium || undefined,
    utm_campaign: utm_campaign || undefined,
    utm_content: utm_content || undefined,
    utm_term: utm_term || undefined,
    landing_url: stored.landing_url || window.location.href,
    referrer: stored.referrer || document.referrer || undefined,
    captured_at: stored.captured_at || new Date().toISOString(),
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // SessionStorage lleno o no accesible
  }

  return payload;
}

/**
 * Obtiene el objeto de atribución actual para adjuntarlo a formularios.
 */
export function getAttributionPayload(): AttributionPayload {
  if (typeof window === "undefined") return {};
  return captureAttribution();
}
