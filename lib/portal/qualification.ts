import type {
  QualificationServiceKey,
  PriceRangeKey,
  CommercialActionStatus,
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

export const PRICE_RANGES: { key: PriceRangeKey; label: string; min: number; max: number }[] = [
  { key: "lt_250", label: "< 250 €", min: 0, max: 250 },
  { key: "250_500", label: "250 - 500 €", min: 250, max: 500 },
  { key: "500_1000", label: "500 - 1.000 €", min: 500, max: 1000 },
  { key: "gt_1000", label: "+ 1.000 €", min: 1000, max: 99999 },
];

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
  if (!priceRangeKey) return null;
  const found = PRICE_RANGES.find((p) => p.key === priceRangeKey);
  return found ? found.label : priceRangeKey;
}

export interface ComputeSignalsInput {
  service: QualificationServiceKey;
  has_storage: boolean;
  has_elevator: boolean;
  price_range?: PriceRangeKey | null;
  status: CommercialActionStatus;
  sale_amount?: number | null;
  client_id?: string;
  channel?: string;
}

/**
 * Deduce automáticamente la puntuación interna (1 a 5) y señales de optimización
 * para Google Ads LSA y Meta CAPI sin sesgo del usuario.
 */
export function computeLeadSignals(input: ComputeSignalsInput): {
  computed_signals: LeadComputedSignals;
  sync: LeadSync;
} {
  // 1. Cálculo de Puntuación Interna (1 a 5)
  let rating = 3;

  if (input.service === "spam_empleo") {
    rating = 1;
  } else if (input.service === "fuera_zona") {
    rating = 1;
  } else if (input.service === "porte_bulto") {
    rating = 2;
  } else if (input.service === "furgoneta") {
    rating = 2;
  } else if (input.service === "mudanza_chica") {
    rating = 3;
  } else if (input.service === "mudanza_mediana") {
    rating = 4;
  } else if (input.service === "mudanza_grande") {
    rating = 5;
  }

  // Modificadores de valor comercial
  if (!isDiscardService(input.service)) {
    if (input.has_storage && rating < 5) {
      rating += 1;
    }
    if (input.has_elevator && rating < 5) {
      rating += 1;
    }
    if (input.price_range === "gt_1000") {
      rating = 5;
    } else if (input.price_range === "500_1000" && rating < 4) {
      rating = 4;
    }
  }

  // Si se cerró venta, el lead adquiere máxima valoración
  if (input.status === "venta") {
    const amount = Number(input.sale_amount) || 0;
    rating = amount >= 600 ? 5 : Math.max(4, rating);
  }

  // Clamp entre 1 y 5
  rating = Math.max(1, Math.min(5, Math.round(rating)));

  // 2. Razón para Google LSA Console
  let lsa_reason = "NOT_SPECIFIED";
  if (input.status === "venta") {
    lsa_reason = "BOOKED_CUSTOMER";
  } else if (input.status === "rechazado") {
    if (input.service === "spam_empleo") {
      lsa_reason = "JOB_DISPUTED_SPAM";
    } else if (input.service === "fuera_zona") {
      lsa_reason = "JOB_DISPUTED_OUT_OF_AREA";
    } else if (input.has_elevator) {
      // Cliente sin maquinaria de elevación o limitación técnica
      lsa_reason = "JOB_DISPUTED_NO_CAPACITY";
    } else {
      lsa_reason = "JOB_DISPUTED_OTHER";
    }
  } else {
    lsa_reason = "IN_PROGRESS";
  }

  // 3. Evento para Meta Conversions API
  let meta_event = "Lead";
  if (input.status === "venta") {
    meta_event = "Purchase";
  } else if (input.status === "rechazado") {
    meta_event = "DisqualifiedLead";
  } else if (input.status === "en_conversacion") {
    meta_event = "QualifiedLead";
  }

  // 4. Acción y Estado para Worker Playwright (Hermes VPS)
  let playwright_action: "archive" | "booked" | null = null;
  let playwright_status: "pending" | "done" | null = null;

  if (input.status === "venta") {
    playwright_action = "booked";
    playwright_status = "pending";
  } else if (input.status === "rechazado") {
    playwright_action = "archive";
    playwright_status = "pending";
  } else {
    // En conversación: no se ejecuta acción en navegador
    playwright_action = null;
    playwright_status = null;
  }

  return {
    computed_signals: {
      internal_rating: rating,
      lsa_reason,
      meta_event,
    },
    sync: {
      capi_sent: input.status === "venta" || input.status === "en_conversacion",
      lsa_api_sent: true,
      playwright_action,
      playwright_status,
      playwright_error: null,
      last_sync_attempt: null,
    },
  };
}
