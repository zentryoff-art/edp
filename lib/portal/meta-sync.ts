import type {
  QualificationServiceKey,
  PriceRangeKey,
  CommercialActionStatus,
  LeadSync,
} from "./types";
import { computeLeadSignals, getPriceRangeEstimate } from "./qualification";
import { validateSaleAmount, applyDotNotationUpdates } from "./lsa-sync";

export interface MetaLeadUpdateParams {
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

export interface MetaLeadUpdateResult {
  error?: string;
  updates?: Record<string, any>;
  resultingDoc?: Record<string, any>;
}

/**
 * Procesa la lógica transaccional de actualización para leads de Meta Ads.
 * Reglas fundamentales:
 * 1. Inmutabilidad de la venta: si ya estaba cerrado como venta, rechazar cualquier modificación.
 * 2. Importe real prioritario: debe ser finito y > 0.
 * 3. Si falta importe real en venta: exigir rango de precios obligatorio y aplicar estimación de respaldo (200 / 250 / 500 / 1000 €).
 * 4. Separación de datos: si falta importe real, qualification.sale_amount = null y sale_amount = null (no falsear facturación).
 * 5. Origen de valor: meta_value_source = 'actual' o 'range_estimate'.
 * 6. Preservar sync: si el evento Meta no cambia, no reiniciar sync ni meta_status = 'pending'.
 * 7. capi_sent solo es true tras confirmación del worker.
 * 8. advertising_source se preserva intacto por omisión en updates.
 */
export function processMetaLeadUpdate(params: MetaLeadUpdateParams): MetaLeadUpdateResult {
  const { currentData, nowIso = new Date().toISOString() } = params;

  // 1. Bloqueo transaccional: una vez cerrada la venta en Meta, ninguna edición es permitida
  const wasSold =
    currentData.status === "cerrado" ||
    currentData.qualification?.status === "venta";

  if (wasSold) {
    return {
      error: "Este lead de Meta ya tiene una venta cerrada definitiva y no puede ser modificado.",
    };
  }

  // 2. Validación de importe real si se proporcionó
  let hasRealAmount = false;
  let validatedRealAmount: number | undefined = undefined;

  if (params.saleAmount !== undefined && params.saleAmount !== null) {
    const valRes = validateSaleAmount(params.saleAmount);
    if (!valRes.valid) {
      return { error: valRes.error };
    }
    if (valRes.value !== undefined && valRes.value > 0) {
      hasRealAmount = true;
      validatedRealAmount = valRes.value;
    }
  }

  // 3. Resolución de servicio y modificadores
  const alreadyQualified = Boolean(currentData.qualification?.service || currentData.score);
  const existingQual = currentData.qualification;

  const serviceKey = alreadyQualified && existingQual?.service
    ? existingQual.service
    : (params.serviceKey || "mudanza_mediana");

  const hasStorage = alreadyQualified && existingQual ? Boolean(existingQual.has_storage) : Boolean(params.hasStorage);
  const hasElevator = alreadyQualified && existingQual ? Boolean(existingQual.has_elevator) : Boolean(params.hasElevator);
  const isNational = alreadyQualified && existingQual ? Boolean(existingQual.is_national) : Boolean(params.isNational);
  const priceRange = alreadyQualified && existingQual ? existingQual.price_range : (params.priceRange || null);

  // 4. Si la acción es "venta" y no hay importe real, exigir obligatoriamente un rango con estimación
  if (params.commercialStatus === "venta" && !hasRealAmount) {
    const estimate = getPriceRangeEstimate(priceRange);
    if (estimate == null) {
      return {
        error: "Debes indicar el importe real o seleccionar un rango de presupuesto para registrar la venta.",
      };
    }
  }

  // 5. Deducción de señales oficiales para Meta CAPI
  const { computed_signals } = computeLeadSignals({
    service: serviceKey,
    has_storage: hasStorage,
    has_elevator: hasElevator,
    is_national: isNational,
    price_range: priceRange,
    status: params.commercialStatus,
    sale_amount: hasRealAmount ? validatedRealAmount : null,
    client_id: params.clientId,
    client_features: params.clientFeatures,
    channel: "meta_ads",
  });

  const updates: Record<string, any> = {};

  // 6. Qualification payload con separación estricta de importe real
  updates["qualification.service"] = serviceKey;
  updates["qualification.has_storage"] = hasStorage;
  updates["qualification.has_elevator"] = hasElevator;
  updates["qualification.is_national"] = isNational;
  updates["qualification.price_range"] = priceRange;
  updates["qualification.status"] = params.commercialStatus;
  updates["qualification.sale_amount"] = hasRealAmount ? validatedRealAmount : null;
  updates["qualification.qualified_at"] = existingQual?.qualified_at || nowIso;

  // 7. Señales computadas
  updates["computed_signals"] = computed_signals;

  // 8. Estado general, score y tipo de servicio
  updates["status"] = params.commercialStatus === "venta" ? "cerrado" : params.commercialStatus;
  updates["score"] = computed_signals.internal_rating;
  updates["service_type"] = serviceKey;
  updates["updated_at"] = nowIso;

  // 9. Facturación real a nivel de raíz (null si no hay importe real para no distorsionar finanzas)
  if (params.commercialStatus === "venta") {
    updates["sale_amount"] = hasRealAmount ? validatedRealAmount : null;
  }

  // 10. Nombre de contacto si se proporcionó
  if (params.contactName !== undefined && params.contactName !== null && params.contactName.trim() !== "") {
    updates["contact_name"] = params.contactName.trim();
  }

  // 11. Preservar sincronización: solo re-encolar a pending si cambia el evento o si no existía sync
  const existingSync: LeadSync = currentData.sync || {};
  const prevMetaEvent = currentData.computed_signals?.meta_event;
  const newMetaEvent = computed_signals.meta_event;

  const eventChanged = newMetaEvent !== prevMetaEvent;
  const hadNoSync = !existingSync.meta_status;

  if (newMetaEvent && (eventChanged || hadNoSync)) {
    updates["sync.meta_status"] = "pending";
    updates["sync.meta_sent_at"] = null;
    updates["sync.meta_error"] = null;
    updates["sync.capi_sent"] = false; // capi_sent solo será true tras confirmación del worker Hermes
  } else if (!newMetaEvent) {
    updates["sync.meta_status"] = null;
    updates["sync.meta_sent_at"] = null;
    updates["sync.meta_error"] = null;
    updates["sync.capi_sent"] = false;
  }
  // Si newMetaEvent no cambió y ya tenía estado (ej. "done"), se preserva intacto sin pisarlo

  const resultingDoc = applyDotNotationUpdates(currentData, updates);
  return { updates, resultingDoc };
}
