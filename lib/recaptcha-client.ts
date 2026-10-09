"use client";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

let loadPromise: Promise<void> | null = null;

/**
 * Carga el script de Google reCAPTCHA v3 únicamente bajo demanda (Lazy Loading).
 * Evita penalizaciones de rendimiento en Google Lighthouse / PageSpeed al no
 * descargar scripts de terceros hasta que el usuario interactúa con un formulario.
 */
export function loadRecaptchaScript(siteKey: string): Promise<void> {
  if (typeof window === "undefined" || !siteKey) {
    return Promise.resolve();
  }

  if (window.grecaptcha) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    // Verificar si el script ya existe en el DOM
    const existing = document.querySelector('script[src*="google.com/recaptcha/api.js"]');
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => {
      console.warn("[reCAPTCHA] Error al cargar script dinámico:", err);
      resolve(); // No romper el formulario del cliente si el CDN de Google está bloqueado (ej: adblockers)
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Precarga silenciosa al hacer focus en el primer input del formulario.
 * Para cuando el usuario termina de escribir, reCAPTCHA ya está listo en memoria (0 ms de espera).
 */
export function preloadRecaptcha(): void {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (siteKey) {
    loadRecaptchaScript(siteKey);
  }
}

/**
 * Ejecuta la verificación de reCAPTCHA v3 para una acción específica y retorna el token.
 * Si no está configurada la variable NEXT_PUBLIC_RECAPTCHA_SITE_KEY, retorna cadena vacía
 * de forma transparente para permitir desarrollo local sin bloqueos.
 */
export async function executeRecaptcha(action: string): Promise<string> {
  if (typeof window === "undefined") {
    return "";
  }

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    return "";
  }

  try {
    await loadRecaptchaScript(siteKey);

    if (!window.grecaptcha) {
      return "";
    }

    return await new Promise<string>((resolve) => {
      window.grecaptcha!.ready(async () => {
        try {
          const token = await window.grecaptcha!.execute(siteKey, { action });
          resolve(token || "");
        } catch (err) {
          console.warn("[reCAPTCHA] Error al ejecutar execute():", err);
          resolve("");
        }
      });
    });
  } catch (err) {
    console.warn("[reCAPTCHA] Fallo general al ejecutar token:", err);
    return "";
  }
}
