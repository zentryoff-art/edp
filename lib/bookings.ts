/**
 * Datos en Supabase (tablas en supabase/migrations). Se accede por la API REST
 * con la service role key, solo desde el servidor.
 *
 * Sin SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY:
 *  - en desarrollo se usa un JSON local (.data/) para poder probar;
 *  - en producción las rutas responden 503.
 */
import { promises as fs } from "fs";
import path from "path";

export type Booking = {
  id: string;
  starts_at: string;
  ends_at: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  sector: string;
  ad_spend: string;
  website: string;
  notes: string;
  status: "confirmed" | "cancelled";
  source: string;
  created_at: string;
  /** Solo en reservas hechas desde el área de clientes. */
  client_id?: string | null;
  user_id?: string | null;
};

export type ContactRequest = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  sector: string;
  message: string;
  source: string;
  created_at: string;
};

export class SlotTakenError extends Error {}
export class NotConfiguredError extends Error {}

const SB_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, "");
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const useSupabase = Boolean(SB_URL && SB_KEY);
const devFallback = !useSupabase && process.env.NODE_ENV !== "production";

export const storageMode = useSupabase ? "supabase" : devFallback ? "local-dev" : "missing";

function assertReady() {
  if (!useSupabase && !devFallback) {
    throw new NotConfiguredError("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
  }
}

async function sb(pathname: string, init: RequestInit = {}) {
  return fetch(`${SB_URL}/rest/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: SB_KEY!,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
}

async function sbJson<T>(pathname: string, init: RequestInit = {}): Promise<T> {
  const res = await sb(pathname, init);
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Respaldo local (solo desarrollo) ──────────

const DIR = path.join(process.cwd(), ".data");

async function readLocal<T>(name: string): Promise<T[]> {
  try {
    return JSON.parse(await fs.readFile(path.join(DIR, `${name}.json`), "utf8"));
  } catch {
    return [];
  }
}

async function writeLocal<T>(name: string, list: T[]) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, `${name}.json`), JSON.stringify(list, null, 2));
}

let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

// ── Reservas ──────────────────────────────────

export async function takenStarts(fromIso: string, toIso: string): Promise<Set<string>> {
  assertReady();
  if (useSupabase) {
    const rows = await sbJson<{ starts_at: string }[]>(
      `bookings?select=starts_at&status=eq.confirmed&starts_at=gte.${encodeURIComponent(fromIso)}&starts_at=lte.${encodeURIComponent(toIso)}`,
    );
    return new Set(rows.map((r) => new Date(r.starts_at).toISOString()));
  }
  const list = await readLocal<Booking>("bookings");
  return new Set(list.filter((b) => b.status === "confirmed" && b.starts_at >= fromIso && b.starts_at <= toIso).map((b) => b.starts_at));
}

/** Días bloqueados en la tabla `blocked_dates` (festivos, vacaciones…). */
export async function blockedDates(): Promise<string[]> {
  assertReady();
  if (!useSupabase) return [];
  const rows = await sbJson<{ date: string }[]>(`blocked_dates?select=date&date=gte.${new Date().toISOString().slice(0, 10)}`);
  return rows.map((r) => r.date);
}

export async function hasUpcomingBooking(email: string): Promise<boolean> {
  assertReady();
  const now = new Date().toISOString();
  if (useSupabase) {
    const rows = await sbJson<unknown[]>(
      `bookings?select=id&status=eq.confirmed&email=eq.${encodeURIComponent(email)}&starts_at=gte.${encodeURIComponent(now)}&limit=1`,
    );
    return rows.length > 0;
  }
  const list = await readLocal<Booking>("bookings");
  return list.some((b) => b.status === "confirmed" && b.email === email && b.starts_at >= now);
}

export async function createBooking(b: Booking): Promise<Booking> {
  assertReady();
  if (useSupabase) {
    const res = await sb("bookings", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(b) });
    if (res.status === 409) throw new SlotTakenError();
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    return (await res.json())[0];
  }
  return locked(async () => {
    const list = await readLocal<Booking>("bookings");
    if (list.some((x) => x.status === "confirmed" && x.starts_at === b.starts_at)) throw new SlotTakenError();
    list.push(b);
    await writeLocal("bookings", list);
    return b;
  });
}

// ── Solicitudes del formulario ────────────────

export async function createContactRequest(r: ContactRequest): Promise<void> {
  assertReady();
  if (useSupabase) {
    const res = await sb("contact_requests", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(r) });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    return;
  }
  await locked(async () => {
    const list = await readLocal<ContactRequest>("contact_requests");
    list.push(r);
    await writeLocal("contact_requests", list);
  });
}
