/**
 * Acceso y persistencia de reservas y contactos en Firebase Firestore.
 */
import { promises as fs } from "fs";
import path from "path";
import { getDb } from "./firebase/admin";

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

const hasFirebase = Boolean(process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
const devFallback = !hasFirebase && process.env.NODE_ENV !== "production";

export const storageMode = hasFirebase ? "firebase" : devFallback ? "local-dev" : "missing";

function assertReady() {
  if (!hasFirebase && !devFallback) {
    throw new NotConfiguredError("Faltan las credenciales de Firebase.");
  }
}

// ── Respaldo local (solo desarrollo sin credenciales) ──

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
  if (hasFirebase) {
    const db = getDb();
    const snap = await db
      .collection("bookings")
      .where("status", "==", "confirmed")
      .where("starts_at", ">=", fromIso)
      .where("starts_at", "<=", toIso)
      .select("starts_at")
      .get();

    return new Set(snap.docs.map((d) => new Date(d.data().starts_at).toISOString()));
  }
  const list = await readLocal<Booking>("bookings");
  return new Set(list.filter((b) => b.status === "confirmed" && b.starts_at >= fromIso && b.starts_at <= toIso).map((b) => b.starts_at));
}

/** Días bloqueados en la colección `blocked_dates` (festivos, vacaciones…). */
export async function blockedDates(): Promise<string[]> {
  assertReady();
  if (!hasFirebase) return [];
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const snap = await db
    .collection("blocked_dates")
    .where("date", ">=", today)
    .get();

  return snap.docs.map((d) => d.data().date);
}

export async function hasUpcomingBooking(email: string): Promise<boolean> {
  assertReady();
  const now = new Date().toISOString();
  if (hasFirebase) {
    const db = getDb();
    const snap = await db
      .collection("bookings")
      .where("status", "==", "confirmed")
      .where("email", "==", email.toLowerCase())
      .where("starts_at", ">=", now)
      .limit(1)
      .get();

    return !snap.empty;
  }
  const list = await readLocal<Booking>("bookings");
  return list.some((b) => b.status === "confirmed" && b.email.toLowerCase() === email.toLowerCase() && b.starts_at >= now);
}

export async function createBooking(b: Booking): Promise<Booking> {
  assertReady();
  if (hasFirebase) {
    const db = getDb();
    // Transacción Firestore para asegurar que no haya colisión en el hueco
    return await db.runTransaction(async (tx) => {
      const existing = await tx.get(
        db.collection("bookings")
          .where("starts_at", "==", b.starts_at)
          .where("status", "==", "confirmed")
          .limit(1)
      );

      if (!existing.empty) {
        throw new SlotTakenError();
      }

      const docRef = db.collection("bookings").doc(b.id);
      tx.set(docRef, b);
      return b;
    });
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
  if (hasFirebase) {
    const db = getDb();
    await db.collection("contact_requests").doc(r.id).set(r);
    return;
  }
  await locked(async () => {
    const list = await readLocal<ContactRequest>("contact_requests");
    list.push(r);
    await writeLocal("contact_requests", list);
  });
}
