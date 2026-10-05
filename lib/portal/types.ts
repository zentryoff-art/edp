export type Client = { id: string; name: string; slug: string; sector: string };

export type Member = {
  userId: string;
  email: string;
  fullName: string;
  role: "owner" | "member";
  client: Client;
  availableClients?: Client[];
};

export type Session = { userId: string; email: string; member: Member | null };

export type Scores = { leads_1: number; leads_2: number; leads_3: number; leads_4: number; leads_5: number };

export type DailyMetric = Scores & {
  date: string; // YYYY-MM-DD
  channel: string;
  spend: number;
  closed: number;
  revenue: number;
};

export type Report = {
  id: string;
  period: string; // YYYY-MM-01
  title: string;
  summary: string;
  highlights: string;
  next_steps: string;
  pdf_url: string;
};

export type PortalBooking = {
  id: string;
  starts_at: string;
  ends_at: string;
  notes: string;
  status: "confirmed" | "cancelled";
  name: string;
};

export type IncidentStatus = "abierta" | "en_curso" | "resuelta";

export type Incident = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
};

export type IncidentMessage = {
  id: string;
  author_name: string;
  is_team: boolean;
  body: string;
  created_at: string;
};

export const INCIDENT_CATEGORIES = ["campañas", "leads", "informes", "facturación", "web", "otra"] as const;
export const INCIDENT_PRIORITIES = ["baja", "normal", "alta", "urgente"] as const;

export type LeadChannel = "google_lsa" | "meta_ads";
export type LeadStatus = "activo" | "en_conversacion" | "cerrado" | "rechazado";

export type QualificationServiceKey =
  | "spam_empleo"
  | "fuera_zona"
  | "porte_bulto"
  | "furgoneta"
  | "mudanza_chica"
  | "mudanza_mediana"
  | "mudanza_grande";

export type LsaSentiment =
  | "VERY_DISSATISFIED"
  | "DISSATISFIED"
  | "NEUTRAL"
  | "SATISFIED"
  | "VERY_SATISFIED";

export type LsaReason =
  // LocalServicesLeadSurveySatisfiedReasonEnum
  | "BOOKED_CUSTOMER"
  | "LIKELY_BOOKED_CUSTOMER"
  | "SERVICE_RELATED"
  | "HIGH_VALUE_SERVICE"
  | "OTHER_SATISFIED_REASON"
  // LocalServicesLeadSurveyDissatisfiedReasonEnum
  | "GEO_MISMATCH"
  | "JOB_TYPE_MISMATCH"
  | "NOT_READY_TO_BOOK"
  | "SPAM"
  | "DUPLICATE"
  | "SOLICITATION"
  | "OTHER_DISSATISFIED_REASON"
  | null;

export type MetaEvent = "DisqualifiedLead" | "QualifiedLead" | "Purchase" | null;

export type PriceRangeKey = "<250" | "250_500" | "500_1000" | "+1000" | "lt_250" | "gt_1000";

export type CommercialActionStatus = "en_conversacion" | "rechazado" | "venta";

export type LeadQualification = {
  service: QualificationServiceKey;
  has_storage: boolean;
  has_elevator: boolean;
  is_national?: boolean;
  price_range?: PriceRangeKey | null;
  status: CommercialActionStatus;
  sale_amount?: number;
  qualified_at: string;
};

export type LeadComputedSignals = {
  internal_rating?: number; // 1 a 5 deducido del sentimiento/valor
  lsa_sentiment: LsaSentiment | null;
  lsa_reason: LsaReason;
  meta_event: MetaEvent;
  meta_value?: number | null;
  meta_currency?: string | null;
};

export type LeadSync = {
  // Google Ads LSA API (Calificación oficial)
  api_status?: "pending" | "done" | "error" | null;
  api_sent_at?: string | null;
  api_error?: string | null;

  // Google Ads LSA (Worker Playwright Hermes)
  playwright_action: "archive" | "booked" | null;
  playwright_status: "pending" | "done" | "error" | null;
  playwright_error?: string | null;

  // Meta CAPI (Worker Hermes REST Graph API)
  meta_status?: "pending" | "done" | "error" | null;
  meta_sent_at?: string | null;
  meta_error?: string | null;

  // Compatibilidad
  capi_sent?: boolean;
  lsa_api_sent?: boolean;
  last_sync_attempt?: string | null;
};

export type LeadAdvertisingSource =
  | {
      channel: "google_lsa";
      customer_id: string;
      external_lead_id: string;
    }
  | {
      channel: "meta_ads";
      ad_account_id: string;
      campaign_id: string;
      external_lead_id: string;
      external_id_kind: "ghl_contact";
      adset_id?: string | null;
      ad_id?: string | null;
      form_id?: string | null;
      meta_lead_id?: string | null;
    };

// Registro de orígenes conocidos para Mudanzas JG (cliente único 'jg')
export const JG_LSA_ACCOUNTS = {
  "9060286511": { key: "jg_lsa_zaragon", customer_id: "9060286511", name: "Zaragon jg (zaragoza)", city: "Zaragoza" },
  "3270480556": { key: "jg_lsa_zaragonjga", customer_id: "3270480556", name: "ZARAGONJGA (barcelona)", city: "Barcelona" },
  "4270099298": { key: "jg_lsa_madrid", customer_id: "4270099298", name: "Zaragon JG Madrid", city: "Madrid" },
} as const;

export const JG_META_AD_ACCOUNT_ID = "act_1132664364628348";

export const JG_META_CAMPAIGNS = {
  "120236907543380002": { key: "jg_meta_general", campaign_id: "120236907543380002", name: "ZJG Mudanzas", city: "General" },
  "120256065951050002": { key: "jg_meta_bcn", campaign_id: "120256065951050002", name: "ZJG Mudanzas - BCN", city: "Barcelona" },
  "120256065861880002": { key: "jg_meta_madrid", campaign_id: "120256065861880002", name: "ZJG Mudanzas - Madrid", city: "Madrid" },
} as const;

export type Lead = {
  id: string;
  lead_id?: number | string;
  account_id?: string;
  client_id: string;
  channel: LeadChannel;
  phone: string;
  contact_name?: string;
  lead_ext_id?: string;

  // Origen publicitario explícito y discriminado por canal
  advertising_source?: LeadAdvertisingSource | null;

  // Modelo unificado de calificación y sincronización
  qualification?: LeadQualification;
  computed_signals?: LeadComputedSignals;
  sync?: LeadSync;

  // Campos retrocompatibles
  score?: number; // 1 a 5 (mapeado de internal_rating o histórico)
  service_type?: string;
  status: LeadStatus;
  sale_amount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
};


