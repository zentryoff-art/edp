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
export type LeadService =
  | "Spam / Empleo"
  | "Porte"
  | "Furgoneta"
  | "Mudanza Chica"
  | "Mudanza Mediana"
  | "Mudanza Grande"
  | "Mudanza + Guardamueble"
  | "Elevación";

export type Lead = {
  id: string;
  client_id: string;
  channel: LeadChannel;
  phone: string;
  contact_name?: string;
  lead_ext_id?: string;
  score?: number; // 1 a 5
  service_type?: LeadService;
  status: LeadStatus;
  sale_amount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
};

