import type {
  QualificationServiceKey,
  PriceRangeKey,
  CommercialActionStatus,
  LsaSentiment,
  LsaReason,
  MetaEvent,
  LeadComputedSignals,
  LeadSync,
} from "./types";

export interface ServiceDefinition {
  key: QualificationServiceKey;
  label: string;
  isDiscard: boolean;
  icon: string;
  description: string;
}

export const QUALIFICATION_SERVICES: ServiceDefinition[] = [
  // 1. Descartes Claros
  {
    key: "spam_empleo",
    label: "Spam / Empleo",
    isDiscard: true,
    icon: "🚫",
    description: "Llamadas de publicidad, ofertas laborales o números erróneos.",
  },
  {
    key: "fuera_zona",
    label: "Fuera de Zona",
    isDiscard: true,
    icon: "📍",
    description: "Ubicación o trayecto no cubierto por la operativa del cliente.",
  },
  {
    key: "porte_bulto",
    label: "Porte / 1 Bulto",
    isDiscard: true,
    icon: "📦",
    description: "Traslado menor de 1 o pocos objetos sin entidad de mudanza.",
  },
  {
    key: "furgoneta",
    label: "Furgoneta",
    isDiscard: true,
    icon: "🚐",
    description: "Portes ligeros o alquiler con conductor.",
  },
  // 2. Servicios de Mudanza
  {
    key: "mudanza_chica",
    label: "Mudanza Chica",
    isDiscard: false,
    icon: "🚚",
    description: "Estudios o viviendas de 1 habitación.",
  },
  {
    key: "mudanza_mediana",
    label: "Mudanza Mediana",
    isDiscard: false,
    icon: "🚛",
    description: "Pisos habituales de 2 a 3 habitaciones.",
  },
  {
    key: "mudanza_grande",
    label: "Mudanza Grande",
    isDiscard: false,
    icon: "🏢",
    description: "Chalets, pisos grandes de 4+ hab. o traslados de oficinas.",
  },
];

export const PRICE_RANGES: {
  key: "<250" | "250_500" | "500_1000" | "+1000";
  label: string;
  min: number;
  max: number;
}[] = [
  { key: "<250", label: "< 250 €", min: 0, max: 250 },
  { key: "250_500", label: "250 - 500 €", min: 250, max: 500 },
  { key: "500_1000", label: "500 - 1.000 €", min: 500, max: 1000 },
  { key: "+1000", label: "+ 1.000 €", min: 1000, max: 99999 },
];

export function normalizePriceRange(
  raw?: PriceRangeKey | string | null
): "<250" | "250_500" | "500_1000" | "+1000" | null {
  if (!raw) return null;
  if (raw === "lt_250" || raw === "<250") return "<250";
  if (raw === "250_500") return "250_500";
  if (raw === "500_1000") return "500_1000";
  if (raw === "gt_1000" || raw === "+1000") return "+1000";
  return null;
}

export function isDiscardService(service?: string | null): boolean {
  if (!service) return false;
  return ["spam_empleo", "fuera_zona", "porte_bulto", "furgoneta"].includes(service);
}

export function getServiceLabel(serviceKey?: string | null): string {
  if (!serviceKey) return "Sin especificar";
  const found = QUALIFICATION_SERVICES.find((s) => s.key === serviceKey);
  return found ? found.label : serviceKey;
}

export function getPriceRangeLabel(priceRangeKey?: string | null): string | null {
  const normalized = normalizePriceRange(priceRangeKey as PriceRangeKey);
  if (!normalized) return null;
  const found = PRICE_RANGES.find((p) => p.key === normalized);
  return found ? found.label : (priceRangeKey || null);
}

export interface LeadQualificationInput {
  service: QualificationServiceKey;
  has_storage: boolean;
  has_elevator: boolean;
  price_range: "<250" | "250_500" | "500_1000" | "+1000" | "lt_250" | "gt_1000" | null;
  status: CommercialActionStatus;
  sale_amount?: number | null;
  client_id?: string; // ej. 'palma'
  channel?: string;
}

/**
 * Matriz de Deducción Directa (UI -> LSA & Meta CAPI)
 * Emplea estrictamente los enums oficiales de Google Ads LSA API y Meta Graph API.
 */
export function computeLeadSignals(data: LeadQualificationInput): {
  lsa_sentiment: LsaSentiment | null;
  lsa_reason: LsaReason;
  pwAction: "archive" | "booked" | null;
  meta: MetaEvent;
  computed_signals: LeadComputedSignals;
  sync: LeadSync;
} {
  const isPalma = Boolean(data.client_id && data.client_id.toLowerCase().includes("palma"));
  const normalizedPrice = normalizePriceRange(data.price_range);

  let lsa_sentiment: LsaSentiment | null = null;
  let lsa_reason: LsaReason = null;
  let pwAction: "archive" | "booked" | null = null;
  let meta: MetaEvent = null;

  // 1. DESCARTES OPERATIVOS Y SPAM
  if (data.service === "spam_empleo") {
    lsa_sentiment = "VERY_DISSATISFIED";
    lsa_reason = "SOLICITATION";
    pwAction = "archive";
    meta = "DisqualifiedLead";
  } else if (data.service === "fuera_zona") {
    lsa_sentiment = "VERY_DISSATISFIED";
    lsa_reason = "GEO_MISMATCH";
    pwAction = "archive";
    meta = "DisqualifiedLead";
  } else if (data.service === "porte_bulto" || data.service === "furgoneta") {
    lsa_sentiment = "VERY_DISSATISFIED";
    lsa_reason = "JOB_TYPE_MISMATCH";
    pwAction = "archive";
    meta = "DisqualifiedLead";
  }

  // 2. EXCEPCIÓN DE MAQUINARIA (Elevador sin máquina propia)
  else if (data.has_elevator && data.status === "rechazado" && !isPalma) {
    lsa_sentiment = "VERY_DISSATISFIED";
    lsa_reason = "JOB_TYPE_MISMATCH";
    pwAction = "archive";
    meta = "DisqualifiedLead";
  }

  // 3. MUDANZA CHICA (Sin extras de alto valor)
  else if (data.service === "mudanza_chica" && !data.has_storage && !(isPalma && data.has_elevator)) {
    if (data.status === "rechazado") {
      lsa_sentiment = "SOMEWHAT_DISSATISFIED";
      lsa_reason = "JOB_TYPE_MISMATCH";
      pwAction = "archive";
      meta = "DisqualifiedLead";
    } else if (data.status === "venta") {
      lsa_sentiment = "NEUTRAL";
      lsa_reason = null; // 'NEUTRAL' no dispara ninguna razón/explicación extra
      pwAction = "booked";
      meta = "Purchase";
    } else {
      // mudanza_chica en conversación sin extras: en espera
      lsa_sentiment = null;
      lsa_reason = null;
      pwAction = null;
      meta = null;
    }
  }

  // 4. VENTAS CERRADAS
  else if (data.status === "venta") {
    const isHighValue =
      normalizedPrice === "+1000" ||
      data.has_storage ||
      (isPalma && data.has_elevator) ||
      data.service === "mudanza_grande";

    lsa_sentiment = isHighValue ? "VERY_SATISFIED" : "SOMEWHAT_SATISFIED";
    lsa_reason = isHighValue ? "HIGH_VALUE_SERVICE" : "BOOKED_CUSTOMER";
    pwAction = "booked";
    meta = "Purchase";
  }

  // 5. MUDANZAS MEDIANAS / GRANDES (En Conversación o Rechazo Comercial)
  else {
    const isHighValue =
      data.service === "mudanza_grande" ||
      data.has_storage ||
      (isPalma && data.has_elevator);

    lsa_sentiment = isHighValue ? "VERY_SATISFIED" : "SOMEWHAT_SATISFIED";
    lsa_reason = isHighValue ? "HIGH_VALUE_SERVICE" : "SERVICE_RELATED";
    pwAction = data.status === "rechazado" ? "archive" : null;
    meta = "QualifiedLead";
  }

  // Deducción directa de rating interno (1 al 5) para UI/reportes
  let internal_rating = 3;
  if (lsa_sentiment === "VERY_DISSATISFIED") internal_rating = 1;
  else if (lsa_sentiment === "SOMEWHAT_DISSATISFIED") internal_rating = 2;
  else if (lsa_sentiment === "NEUTRAL") internal_rating = 3;
  else if (lsa_sentiment === "SOMEWHAT_SATISFIED") internal_rating = 4;
  else if (lsa_sentiment === "VERY_SATISFIED") internal_rating = 5;

  // Valor monetario para Meta CAPI
  let meta_value: number | null = null;
  if (meta === "Purchase") {
    meta_value = Number(data.sale_amount) || 0;
  } else if (meta === "QualifiedLead") {
    if (normalizedPrice === "+1000") meta_value = 1200;
    else if (normalizedPrice === "500_1000") meta_value = 750;
    else if (normalizedPrice === "250_500") meta_value = 375;
    else if (normalizedPrice === "<250") meta_value = 200;
    else meta_value = 500;
  }

  const computed_signals: LeadComputedSignals = {
    internal_rating,
    lsa_sentiment,
    lsa_reason,
    meta_event: meta,
    meta_value,
    meta_currency: "EUR",
  };

  const sync: LeadSync = {
    playwright_action: pwAction,
    playwright_status: pwAction ? "pending" : null,
    playwright_error: null,
    meta_status: meta ? "pending" : null,
    meta_sent_at: null,
    meta_error: null,
    capi_sent: Boolean(meta),
    lsa_api_sent: Boolean(lsa_reason),
    last_sync_attempt: null,
  };

  return {
    lsa_sentiment,
    lsa_reason,
    pwAction,
    meta,
    computed_signals,
    sync,
  };
}
