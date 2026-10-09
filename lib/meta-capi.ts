import "server-only";
import { createHash } from "crypto";

export interface MetaCapiUser {
  email?: string;
  phone?: string;
  name?: string;
  company?: string;
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
}

export interface SendMetaCapiOptions {
  eventName: "Lead" | "Schedule" | "Contact" | string;
  eventId?: string;
  eventSourceUrl?: string;
  user: MetaCapiUser;
  customData?: Record<string, unknown>;
}

export interface MetaCapiResult {
  success: boolean;
  skipped?: boolean;
  eventsReceived?: number;
  error?: string;
}

/**
 * Normaliza y hashea cadenas en SHA-256 según el estándar de Meta Graph API.
 */
function hashString(val?: string | null): string | undefined {
  if (!val || typeof val !== "string") return undefined;
  const clean = val.trim().toLowerCase();
  if (!clean) return undefined;
  return createHash("sha256").update(clean).digest("hex");
}

/**
 * Normaliza y hashea teléfonos en formato internacional de solo dígitos.
 */
function hashPhone(val?: string | null): string | undefined {
  if (!val || typeof val !== "string") return undefined;
  let digits = val.replace(/\D/g, "");
  if (!digits) return undefined;

  // Si es número español de 9 dígitos sin prefijo (ej. 612345678), añadir 34
  if (digits.length === 9 && ["6", "7", "8", "9"].includes(digits[0])) {
    digits = `34${digits}`;
  }

  return createHash("sha256").update(digits).digest("hex");
}

/**
 * Envía un evento del servidor a la API de Conversiones de Meta (CAPI).
 * Si no hay claves configuradas, finaliza silenciosamente con skipped=true sin coste.
 */
export async function sendMetaCapiEvent(options: SendMetaCapiOptions): Promise<MetaCapiResult> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const testCode = process.env.META_TEST_EVENT_CODE;

  // Si no está configurado el token o el pixel, no hacer nada (modo seguro)
  if (!pixelId || !accessToken) {
    return { success: true, skipped: true };
  }

  try {
    const emailHash = hashString(options.user.email);
    const phoneHash = hashPhone(options.user.phone);
    const firstName = options.user.name?.split(" ")[0];
    const lastName = options.user.name?.split(" ").slice(1).join(" ");
    const fnHash = hashString(firstName);
    const lnHash = hashString(lastName);

    const eventPayload = {
      event_name: options.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: options.eventId,
      event_source_url: options.eventSourceUrl || "https://estudiodigitalpro.com",
      action_source: "website",
      user_data: {
        ...(emailHash ? { em: [emailHash] } : {}),
        ...(phoneHash ? { ph: [phoneHash] } : {}),
        ...(fnHash ? { fn: [fnHash] } : {}),
        ...(lnHash ? { ln: [lnHash] } : {}),
        ...(options.user.ip ? { client_ip_address: options.user.ip } : {}),
        ...(options.user.userAgent ? { client_user_agent: options.user.userAgent } : {}),
        ...(options.user.fbp ? { fbp: options.user.fbp } : {}),
        ...(options.user.fbc ? { fbc: options.user.fbc } : {}),
      },
      ...(options.customData ? { custom_data: options.customData } : {}),
    };

    const body: Record<string, unknown> = {
      data: [eventPayload],
    };

    if (testCode) {
      body.test_event_code = testCode;
    }

    const res = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.warn("[Meta CAPI] Error en Graph API:", data?.error?.message || res.statusText);
      return {
        success: false,
        error: data?.error?.message || "Error al enviar evento CAPI",
      };
    }

    return {
      success: true,
      eventsReceived: data.events_received,
    };
  } catch (err) {
    console.error("[Meta CAPI] Excepción al enviar evento:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error inesperado",
    };
  }
}
