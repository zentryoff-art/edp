import type {
  QualificationServiceKey,
  PriceRangeKey,
  CommercialActionStatus,
  LeadTracking,
  LeadSync,
} from "./types";
import { computeLeadSignals, getPriceRangeEstimate } from "./qualification";

export interface LsaLeadUpdateParams {
  currentData: Record<string, any>;
  leadId: string;
  clientId: string;
  serviceKey?: QualificationServiceKey;
  hasStorage?: boolean;
  hasElevator?: boolean;
  isNational?: boolean;
  priceRange?: PriceRangeKey | null;
  commercialStatus: CommercialActionStatus;
  saleAmount?: number | null; // número positivo, null o undefined (omitido)
  contactName?: string | null;
  clientFeatures?: import("./types").ClientFeatures;
  nowIso?: string;
}

export interface LsaLeadUpdateResult {
  error?: string;
  updates?: Record<string, any>;
  resultingDoc?: Record<string, any>;
}

export function validateSaleAmount(rawAmount: unknown): { valid: boolean; value?: number; error?: string } {
  if (rawAmount === undefined || rawAmount === null || rawAmount === "") {
    return { valid: true, value: undefined };
  }
  const n = Number(rawAmount);
  if (!Number.isFinite(n) || n <= 0) {
    return { valid: false, error: "El importe debe ser un número positivo en euros (€)." };
  }
  return { valid: true, value: n };
}

/**
 * Aplica actualizaciones por dot-notation sobre un objeto en memoria (para simulación / retorno de documento)
 */
export function applyDotNotationUpdates(target: Record<string, any>, updates: Record<string, any>): Record<string, any> {
  const result = JSON.parse(JSON.stringify(target));
  for (const [key, val] of Object.entries(updates)) {
    const parts = key.split(".");
    let curr = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!curr[parts[i]] || typeof curr[parts[i]] !== "object") {
        curr[parts[i]] = {};
      }
      curr = curr[parts[i]];
    }
    curr[parts[parts.length - 1]] = val;
  }
  return result;
}

/**
 * Procesa la lógica transaccional de actualización para leads de Google LSA.
 * Separa de manera estricta:
 * 1. Rating por Google Ads API (definitivo, solo se encola si hay sentimiento y no se envió).
 * 2. Cierre definitivo / Playwright (Booked / Archive, inmutable una vez solicitado).
 * 3. Tracking de Booked (editable posteriormente con incremento atómico de revisiones).
 */
export function processLsaLeadUpdate(params: LsaLeadUpdateParams): LsaLeadUpdateResult {
  const { currentData, nowIso = new Date().toISOString() } = params;

  // 1. Validar importe si fue proporcionado
  if (params.saleAmount !== undefined && params.saleAmount !== null) {
    const valRes = validateSaleAmount(params.saleAmount);
    if (!valRes.valid) {
      return { error: valRes.error };
    }
  }

  // 2. Comprobar si el lead ya tenía un cierre definitivo solicitado o completado
  const wasClosed =
    currentData.status === "cerrado" ||
    currentData.status === "rechazado" ||
    currentData.qualification?.status === "venta" ||
    currentData.qualification?.status === "rechazado" ||
    currentData.sync?.playwright_action != null ||
    currentData.sync?.playwright_status === "done" ||
    currentData.sync?.playwright_status === "pending";

  const prevStatus: "venta" | "rechazado" =
    currentData.qualification?.status === "venta" ||
    currentData.status === "cerrado" ||
    currentData.sync?.playwright_action === "booked"
      ? "venta"
      : "rechazado";

  const updates: Record<string, any> = {};

  if (wasClosed) {
    // Regla: No permitir cambiar entre venta y rechazo una vez solicitado el cierre definitivo.
    if (params.commercialStatus !== prevStatus) {
      return {
        error: "No se puede cambiar entre venta y rechazo una vez solicitado el cierre definitivo.",
      };
    }

    updates["updated_at"] = nowIso;

    // Actualización de nombre local
    let finalCustomerName: string | undefined = undefined;
    if (params.contactName !== undefined && params.contactName !== null && params.contactName.trim() !== "") {
      finalCustomerName = params.contactName.trim();
      updates["contact_name"] = finalCustomerName;
    } else {
      finalCustomerName = currentData.tracking?.customer_name ?? currentData.contact_name;
    }

    if (prevStatus === "venta") {
      // Importe: si viene especificado, se actualiza. Si se omite, se conserva el existente (no se borra ni se fuerza a 0).
      let finalPrice: number | null | undefined = undefined;
      if (params.saleAmount !== undefined && params.saleAmount !== null) {
        finalPrice = params.saleAmount;
        updates["qualification.sale_amount"] = params.saleAmount;
        updates["sale_amount"] = params.saleAmount;
      } else {
        finalPrice = currentData.qualification?.sale_amount ?? currentData.sale_amount ?? null;
      }

      // Evaluar cambios para tracking
      const existingTracking: LeadTracking | undefined = currentData.tracking;
      const desiredName = finalCustomerName;
      const desiredPrice = finalPrice !== null && finalPrice !== undefined ? finalPrice : undefined;

      const nameChanged = desiredName !== undefined && desiredName !== existingTracking?.customer_name;
      const priceChanged = desiredPrice !== undefined && desiredPrice !== existingTracking?.price_estimate;
      const hasTrackingChange = nameChanged || priceChanged;

      if (hasTrackingChange) {
        const nextRev = (existingTracking?.revision || 0) + 1;
        const newTracking: LeadTracking = {
          revision: nextRev,
        };
        if (desiredName !== undefined) newTracking.customer_name = desiredName;
        if (desiredPrice !== undefined) newTracking.price_estimate = desiredPrice;

        updates["tracking"] = newTracking;
        updates["sync.tracking_status"] = "pending";
        updates["sync.tracking_error"] = null;
      }
      // Si no hubo cambio en tracking, se preserva tracking_status y revision sin cambios.
    } else {
      // En un lead rechazado, el nombre puede editarse localmente, pero no encolar tracking de Booked.
    }

    const resultingDoc = applyDotNotationUpdates(currentData, updates);
    return { updates, resultingDoc };
  }

  // 3. Lead aún no cerrado (Primera calificación o transición inicial)
  const alreadyQualified = Boolean(currentData.qualification?.service || currentData.score);
  const existingQual = currentData.qualification;

  const serviceKey = alreadyQualified && existingQual?.service
    ? existingQual.service
    : (params.serviceKey || "mudanza_mediana");

  const hasStorage = alreadyQualified && existingQual ? Boolean(existingQual.has_storage) : Boolean(params.hasStorage);
  const hasElevator = alreadyQualified && existingQual ? Boolean(existingQual.has_elevator) : Boolean(params.hasElevator);
  const isNational = alreadyQualified && existingQual ? Boolean(existingQual.is_national) : Boolean(params.isNational);
  const priceRange = alreadyQualified && existingQual ? existingQual.price_range : (params.priceRange || null);

  // Resolver importe inicial si es venta
  const hasProvidedAmount = params.saleAmount !== undefined && params.saleAmount !== null;
  const resolvedSaleAmount = hasProvidedAmount
    ? params.saleAmount
    : (existingQual?.sale_amount ?? currentData.sale_amount ?? null);

  const estimate = getPriceRangeEstimate(priceRange);

  // Si la acción es "venta" y no hay importe real, exigir obligatoriamente un rango con estimación
  if (params.commercialStatus === "venta" && resolvedSaleAmount == null) {
    if (estimate == null) {
      return {
        error: "Debes indicar el importe real o seleccionar un rango de presupuesto para registrar la venta.",
      };
    }
  }

  // Calcular señales oficiales Google LSA (no activa Meta para LSA)
  const { computed_signals } = computeLeadSignals({
    service: serviceKey,
    has_storage: hasStorage,
    has_elevator: hasElevator,
    is_national: isNational,
    price_range: priceRange,
    status: params.commercialStatus,
    sale_amount: resolvedSaleAmount,
    client_id: params.clientId,
    client_features: params.clientFeatures,
    channel: "google_lsa",
  });

  // A. Rating por API: Encolar solo cuando exista sentimiento y no haya calificación enviada o en proceso
  const apiStatus = currentData.sync?.api_status;
  const isApiDoneOrPending = apiStatus === "done" || apiStatus === "pending";

  if (!isApiDoneOrPending) {
    if (computed_signals.lsa_sentiment) {
      updates["sync.api_status"] = "pending";
      updates["sync.api_error"] = null;
    } else {
      // Si inicialmente no hay sentimiento (ej. mudanza chica en conversación), dejar API sin tarea
      if (!currentData.sync?.api_status) {
        updates["sync.api_status"] = null;
      }
    }
  }

  // B. Transición comercial y Playwright
  if (params.commercialStatus === "venta") {
    updates["status"] = "cerrado";
    updates["sync.playwright_action"] = "booked";
    updates["sync.playwright_status"] = "pending";
    updates["sync.playwright_error"] = null;

    if (resolvedSaleAmount != null) {
      updates["sale_amount"] = resolvedSaleAmount;
    } else {
      updates["sale_amount"] = null;
    }

    // Inicializar tracking disponible para cuando Playwright confirme Booked (usando importe real o respaldo)
    const trackName = (params.contactName !== undefined && params.contactName !== null && params.contactName.trim() !== "")
      ? params.contactName.trim()
      : currentData.contact_name;
    const trackPrice = resolvedSaleAmount != null ? resolvedSaleAmount : (estimate ?? undefined);

    if (trackName || trackPrice !== undefined) {
      const initialTracking: LeadTracking = { revision: 1 };
      if (trackName) initialTracking.customer_name = trackName;
      if (trackPrice !== undefined) initialTracking.price_estimate = trackPrice;
      updates["tracking"] = initialTracking;
      updates["sync.tracking_status"] = "pending";
      updates["sync.tracking_error"] = null;
    }
  } else if (params.commercialStatus === "rechazado") {
    updates["status"] = "rechazado";
    updates["sync.playwright_action"] = "archive";
    updates["sync.playwright_status"] = "pending";
    updates["sync.playwright_error"] = null;
  } else {
    updates["status"] = "en_conversacion";
  }

  // C. Estructura de calificación
  const qualPayload: Record<string, any> = {
    service: serviceKey,
    has_storage: hasStorage,
    has_elevator: hasElevator,
    is_national: isNational,
    price_range: priceRange,
    status: params.commercialStatus,
    sale_amount: resolvedSaleAmount,
    qualified_at: existingQual?.qualified_at || nowIso,
  };

  updates["qualification"] = qualPayload;
  updates["computed_signals"] = computed_signals;
  updates["score"] = computed_signals.internal_rating;
  updates["service_type"] = serviceKey;

  if (params.contactName !== undefined && params.contactName !== null && params.contactName.trim() !== "") {
    updates["contact_name"] = params.contactName.trim();
  }

  updates["updated_at"] = nowIso;

  // Garantizar que no se activa meta_status para leads de LSA
  if (currentData.sync?.meta_status === undefined) {
    updates["sync.meta_status"] = null;
  }

  const resultingDoc = applyDotNotationUpdates(currentData, updates);
  return { updates, resultingDoc };
}
