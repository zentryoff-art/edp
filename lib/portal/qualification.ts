import {
  type QualificationServiceKey,
  type PriceRangeKey,
  type CommercialActionStatus,
  type LsaSentiment,
  type LsaReason,
  type MetaEvent,
  type MetaValueSource,
  type LeadComputedSignals,
  type LeadSync,
  type Lead,
  type LeadStatus,
  type LeadAdvertisingSource,
  type ClientFeatures,
  JG_LSA_ACCOUNTS,
  JG_META_AD_ACCOUNT_ID,
  JG_META_CAMPAIGNS,
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

/**
 * Respaldo conservador de valor monetario cuando no se aporta importe real:
 * - Menos de 250 €: 200 €
 * - 250 - 500 €: 250 €
 * - 500 - 1.000 €: 500 €
 * - Más de 1.000 €: 1.000 €
 */
export function getPriceRangeEstimate(priceRangeKey?: PriceRangeKey | string | null): number | null {
  const normalized = normalizePriceRange(priceRangeKey as PriceRangeKey);
  switch (normalized) {
    case "<250":
      return 200;
    case "250_500":
      return 250;
    case "500_1000":
      return 500;
    case "+1000":
      return 1000;
    default:
      return null;
  }
}

export interface LeadQualificationInput {
  service: QualificationServiceKey;
  has_storage: boolean;
  has_elevator: boolean;
  is_national?: boolean;
  price_range: "<250" | "250_500" | "500_1000" | "+1000" | "lt_250" | "gt_1000" | null;
  status: CommercialActionStatus;
  sale_amount?: number | null;
  client_id?: string; // ej. 'palma', 'shalom', 'jg', 'laterra', 'duala', 'henry'
  client_features?: ClientFeatures;
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
  const clientId = (data.client_id || "").toLowerCase();

  // Capacidades dinámicas del cliente:
  // 1. Grúa / Elevador: Si se especificó en features, usarlo. De lo contrario, Palma y La Terra tienen elevador propio.
  const hasElevatorCapability =
    data.client_features?.has_elevator !== undefined
      ? data.client_features.has_elevator
      : Boolean(clientId.includes("palma") || clientId.includes("laterra"));

  // 2. Mudanza Nacional: Si se especificó en features, usarlo. De lo contrario, todos excepto Shalom aceptan nacional.
  const acceptsNationalCapability =
    data.client_features?.accepts_national !== undefined
      ? data.client_features.accepts_national
      : Boolean(!clientId || !clientId.includes("shalom"));

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

  // 2. EXCEPCIÓN MUDANZA NACIONAL (Cuando el cliente no opera a nivel nacional, ej. Shalom)
  else if (data.is_national && !acceptsNationalCapability) {
    lsa_sentiment = "VERY_DISSATISFIED";
    lsa_reason = "GEO_MISMATCH";
    pwAction = data.status === "rechazado" ? "archive" : null;
    meta = "DisqualifiedLead";
  }

  // 3. EXCEPCIÓN DE MAQUINARIA (Elevador / Grúa): Clientes sin grúa propia descartan el trabajo
  else if (data.has_elevator && !hasElevatorCapability) {
    lsa_sentiment = "VERY_DISSATISFIED";
    lsa_reason = "JOB_TYPE_MISMATCH";
    pwAction = data.status === "rechazado" ? "archive" : null;
    meta = "DisqualifiedLead";
  }

  // 4. MUDANZA CHICA (Sin extras de alto valor)
  else if (
    data.service === "mudanza_chica" &&
    !data.has_storage &&
    !(acceptsNationalCapability && data.is_national) &&
    !(hasElevatorCapability && data.has_elevator)
  ) {
    if (data.status === "rechazado") {
      lsa_sentiment = "DISSATISFIED";
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

  // 5. VENTAS CERRADAS
  else if (data.status === "venta") {
    const isHighValue =
      normalizedPrice === "+1000" ||
      data.has_storage ||
      Boolean(acceptsNationalCapability && data.is_national) ||
      Boolean(hasElevatorCapability && data.has_elevator) ||
      data.service === "mudanza_grande";

    lsa_sentiment = isHighValue ? "VERY_SATISFIED" : "SATISFIED";
    lsa_reason = isHighValue ? "HIGH_VALUE_SERVICE" : "BOOKED_CUSTOMER";
    pwAction = "booked";
    meta = "Purchase";
  }

  // 6. MUDANZAS MEDIANAS / GRANDES / NACIONALES (En Conversación o Rechazo Comercial)
  else {
    const isHighValue =
      data.service === "mudanza_grande" ||
      data.has_storage ||
      Boolean(acceptsNationalCapability && data.is_national) ||
      Boolean(hasElevatorCapability && data.has_elevator);

    lsa_sentiment = isHighValue ? "VERY_SATISFIED" : "SATISFIED";
    lsa_reason = isHighValue ? "HIGH_VALUE_SERVICE" : "SERVICE_RELATED";
    pwAction = data.status === "rechazado" ? "archive" : null;
    meta = "QualifiedLead";
  }

  // Deducción directa de rating interno (1 al 5) para UI/reportes
  let internal_rating = 3;
  if (lsa_sentiment === "VERY_DISSATISFIED") internal_rating = 1;
  else if (lsa_sentiment === "DISSATISFIED") internal_rating = 2;
  else if (lsa_sentiment === "NEUTRAL") internal_rating = 3;
  else if (lsa_sentiment === "SATISFIED") internal_rating = 4;
  else if (lsa_sentiment === "VERY_SATISFIED") internal_rating = 5;

  // Valor monetario para Meta CAPI: estrictamente cuando meta_event === 'Purchase' (Venta)
  // Prioridad: Importe real si es válido (> 0) con origen "actual".
  // Respaldo: Estimación conservadora basada en el rango elegido con origen "range_estimate".
  const isPurchase = meta === "Purchase";
  let meta_value: number | null = null;
  let meta_currency: string | null = null;
  let meta_value_source: MetaValueSource | null = null;

  if (isPurchase) {
    const rawSale = data.sale_amount != null ? Number(data.sale_amount) : null;
    if (rawSale != null && Number.isFinite(rawSale) && rawSale > 0) {
      meta_value = rawSale;
      meta_currency = "EUR";
      meta_value_source = "actual";
    } else {
      const estimate = getPriceRangeEstimate(data.price_range);
      if (estimate != null) {
        meta_value = estimate;
        meta_currency = "EUR";
        meta_value_source = "range_estimate";
      }
    }
  }

  const computed_signals: LeadComputedSignals = {
    internal_rating,
    lsa_sentiment,
    lsa_reason,
    meta_event: meta,
    meta_value,
    meta_currency,
    meta_value_source,
  };

  const isLsa = data.channel !== "meta_ads";
  const api_status = isLsa && Boolean(lsa_sentiment || lsa_reason) ? "pending" : null;

  const sync: LeadSync = {
    api_status,
    api_sent_at: null,
    api_error: null,
    playwright_action: pwAction,
    playwright_status: pwAction ? "pending" : null,
    playwright_error: null,
    meta_status: meta ? "pending" : null,
    meta_sent_at: null,
    meta_error: null,
    capi_sent: false,
    lsa_api_sent: false,
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

export interface AdvertisingSourceInfo {
  label: string;
  sublabel?: string;
  city?: string;
  sourceKey?: string;
}

export function getAdvertisingSourceInfo(source?: LeadAdvertisingSource | null): AdvertisingSourceInfo | null {
  if (!source) return null;

  if (source.channel === "google_lsa") {
    const known = (JG_LSA_ACCOUNTS as Record<string, any>)[source.customer_id];
    if (known) {
      return {
        label: `LSA · ${known.city}`,
        sublabel: known.name,
        city: known.city,
        sourceKey: known.key,
      };
    }
    return {
      label: "Google LSA",
      sublabel: `ID: ${source.customer_id}`,
    };
  }

  if (source.channel === "meta_ads") {
    const known = (JG_META_CAMPAIGNS as Record<string, any>)[source.campaign_id];
    if (known) {
      return {
        label: `Meta · ${known.city}`,
        sublabel: known.name,
        city: known.city,
        sourceKey: known.key,
      };
    }
    return {
      label: "Meta Ads",
      sublabel: `Campaña: ${source.campaign_id}`,
    };
  }

  return null;
}

/**
 * Extrae limpiamente el mensaje del cliente, ya sea desde el campo nativo `message`
 * o como fallback retrocompatible extrayéndolo de las comillas en `notes`.
 */
export function extractLeadMessage(lead: { message?: string | null; notes?: string }): string | null {
  if (typeof lead.message === "string" && lead.message.trim().length > 0) {
    return lead.message.trim();
  }
  if (!lead.notes) return null;
  // Match 💬 “...” o 💬 "..." o 💬 '...' en notes
  const match = lead.notes.match(/💬\s*[“"']([^”"']+)[”"']/);
  if (match && match[1]?.trim()) {
    return match[1].trim();
  }
  return null;
}

/**
 * Normaliza un documento Firestore de /leads/{id} al tipo uniforme Lead de TypeScript.
 * Usado tanto en servidor (getLeads) como en cliente (onSnapshot en vivo).
 */
export function normalizeLeadDoc(id: string, data: Record<string, any>): Lead {
  let status: LeadStatus = data.status || "activo";
  if (data.qualification?.status) {
    status = data.qualification.status === "venta" ? "cerrado" : data.qualification.status;
  }
  // Normalizar estados preliminares como "pendiente" a "activo"
  if (status === ("pendiente" as any) || status === ("nuevo" as any)) {
    status = "activo";
  }

  const score =
    data.computed_signals?.internal_rating ??
    (data.score != null ? Number(data.score) : undefined);

  const serviceType = data.qualification?.service
    ? data.qualification.service
    : data.service_type;

  const phone = data.phone || data.contact?.phone || "";
  const contactName = data.contact_name || data.contact?.name || "";
  // Priorizar siempre la fecha real de generación del lead (Google LSA / Meta Ads)
  // sobre la fecha técnica de inserción o backfill en Firestore (created_at).
  const createdAt =
    data.lead_created_at ||
    (data.google_creation_date_time
      ? data.google_creation_date_time.includes("T")
        ? data.google_creation_date_time
        : data.google_creation_date_time.replace(" ", "T") + "Z"
      : null) ||
    data.created_at ||
    new Date().toISOString();
  const updatedAt = data.updated_at || createdAt;

  // Extraer metadatos de campaña y anuncio de Meta desde notes (webhook GHL/Facebook) si no vienen en primer nivel
  let metaPayload: Record<string, any> | null = null;
  if (data.notes && typeof data.notes === "string" && data.notes.includes("{")) {
    try {
      const jsonStart = data.notes.indexOf("{");
      const jsonEnd = data.notes.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        metaPayload = JSON.parse(data.notes.slice(jsonStart, jsonEnd + 1));
      }
    } catch {
      // Ignorar fallo de parseo
    }
  }

  const isMetaChannel = data.channel === "meta_ads" || (!data.channel && Boolean(metaPayload?.ghl_source === "Facebook" || metaPayload?.meta_campaign_id));
  const channel: Lead["channel"] = isMetaChannel ? "meta_ads" : "google_lsa";

  const resolvedCampaignId =
    data.campaign_id ||
    metaPayload?.meta_campaign_id ||
    (isMetaChannel ? data.account_ref : undefined) ||
    "";

  const resolvedAdId = data.ad_id || metaPayload?.meta_ad_id || null;
  const resolvedAdsetId = data.adset_id || metaPayload?.meta_adset_id || null;
  const resolvedFormId = data.form_id || metaPayload?.meta_form_id || null;

  const accountId =
    data.account_id ||
    data.customer_id ||
    (isMetaChannel ? resolvedCampaignId || data.account_ref : data.account_ref) ||
    undefined;

  let advertisingSource: LeadAdvertisingSource | null = data.advertising_source || null;
  if (!advertisingSource) {
    if (isMetaChannel && (resolvedCampaignId || data.ad_account_id || data.account_ref)) {
      advertisingSource = {
        channel: "meta_ads",
        ad_account_id: data.ad_account_id || JG_META_AD_ACCOUNT_ID,
        campaign_id: String(resolvedCampaignId || data.account_ref || ""),
        external_lead_id: String(data.external_lead_id || data.lead_ext_id || data.lead_id || id),
        external_id_kind: "ghl_contact",
        adset_id: resolvedAdsetId,
        ad_id: resolvedAdId,
        form_id: resolvedFormId,
        meta_lead_id: data.meta_lead_id || null,
      };
    } else if ((channel === "google_lsa" || !channel) && (data.customer_id || data.account_id || data.account_ref)) {
      advertisingSource = {
        channel: "google_lsa",
        customer_id: String(data.customer_id || data.account_id || data.account_ref || ""),
        external_lead_id: String(data.external_lead_id || data.lead_ext_id || data.lead_id || id),
      };
    }
  }

  // Si la ubicación no viene indicada, deducirla de la campaña o cuenta conocida si existe
  let location = data.location || null;
  if (!location) {
    if (isMetaChannel && resolvedCampaignId && (JG_META_CAMPAIGNS as Record<string, any>)[resolvedCampaignId]?.city) {
      location = {
        display_name: (JG_META_CAMPAIGNS as Record<string, any>)[resolvedCampaignId].city,
        source: "campaign",
      };
    } else if (accountId && (JG_LSA_ACCOUNTS as Record<string, any>)[accountId]?.city) {
      location = {
        display_name: (JG_LSA_ACCOUNTS as Record<string, any>)[accountId].city,
        source: "account",
      };
    }
  }

  const extractedMessage =
    data.message !== undefined && data.message !== null
      ? (typeof data.message === "string" && data.message.trim().length > 0 ? data.message.trim() : null)
      : extractLeadMessage({ message: data.message, notes: data.notes });

  let leadType: Lead["lead_type"] = data.lead_type || null;
  if (!leadType) {
    if (extractedMessage || (data.notes && data.notes.includes("💬 Mensaje"))) {
      leadType = "message";
    } else if (data.notes && (data.notes.includes("📞 Telefono") || data.notes.includes("📞 Teléfono"))) {
      leadType = "phone_call";
    }
  }

  return {
    id,
    lead_id: data.lead_id || data.lead_ext_id || id,
    account_id: accountId,
    client_id: data.client_id,
    channel,
    lead_type: leadType,
    message: extractedMessage,
    phone,
    contact_name: contactName,
    lead_ext_id: data.lead_ext_id || "",
    location,
    advertising_source: advertisingSource,
    qualification: data.qualification || null,
    computed_signals: data.computed_signals || null,
    sync: data.sync || null,
    tracking: data.tracking || null,
    score,
    service_type: serviceType,
    status,
    sale_amount:
      data.qualification?.sale_amount != null
        ? Number(data.qualification.sale_amount)
        : data.sale_amount != null
        ? Number(data.sale_amount)
        : undefined,
    google_lead_status: data.google_lead_status || null,
    lead_charged: data.lead_charged !== undefined ? data.lead_charged : null,
    google_lead_charged_raw: data.google_lead_charged_raw !== undefined ? data.google_lead_charged_raw : null,
    google_charge_resolution: data.google_charge_resolution || null,
    google_synced_at: data.google_synced_at || null,
    notes: data.notes || "",
    created_at: createdAt,
    updated_at: updatedAt,
  };
}
