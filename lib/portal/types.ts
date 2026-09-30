export type Client = { id: string; name: string; slug: string; sector: string };

export type Member = {
  userId: string;
  email: string;
  fullName: string;
  role: "owner" | "member";
  client: Client;
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

export type PriceRangeKey = "lt_250" | "250_500" | "500_1000" | "gt_1000";

export type CommercialActionStatus = "en_conversacion" | "rechazado" | "venta";

export type LeadQualification = {
  service: QualificationServiceKey;
  has_storage: boolean;
  has_elevator: boolean;
  price_range?: PriceRangeKey | null;
  status: CommercialActionStatus;
  sale_amount?: number;
  qualified_at: string;
};

export type LeadComputedSignals = {
  internal_rating: number; // 1 a 5 deducido automáticamente
  lsa_reason: string;
  meta_event: string;
};

export type LeadSync = {
  capi_sent: boolean;
  lsa_api_sent: boolean;
  playwright_action: "archive" | "booked" | null;
  playwright_status: "pending" | "done" | "error" | null;
  playwright_error?: string | null;
  last_sync_attempt?: string | null;
};

export type Lead = {
  id: string;
  lead_id?: number | string;
  account_id?: string;
  client_id: string;
  channel: LeadChannel;
  phone: string;
  contact_name?: string;
  lead_ext_id?: string;

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

