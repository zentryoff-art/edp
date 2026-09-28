/**
 * Lógica común de reserva de llamadas: validación, hueco libre, guardado y correos.
 * La usan la landing pública (/api/bookings) y el área de clientes (/api/portal/bookings).
 */
import { randomUUID } from "crypto";
import { BOOKING, isValidSlot } from "./availability";
import { blockedDates, createBooking, hasUpcomingBooking, NotConfiguredError, SlotTakenError, type Booking } from "./bookings";
import { notifyBooking } from "./mail";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s().-]{7,}$/;

export const clean = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Límite simple por IP (por instancia): 5 intentos cada 10 minutos.
const hits = new Map<string, number[]>();
export function rateLimited(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

export type BookingInput = {
  start: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  sector: string;
  ad_spend: string;
  website: string;
  notes: string;
  source: string;
  client_id?: string | null;
  user_id?: string | null;
};

export type BookingResult = { status: number; body: Record<string, unknown> };

export async function processBooking(input: BookingInput): Promise<BookingResult> {
  const missing: string[] = [];
  if (!input.name) missing.push("nombre");
  if (!input.company) missing.push("empresa");
  if (!EMAIL_RE.test(input.email)) missing.push("email");
  if (!PHONE_RE.test(input.phone)) missing.push("teléfono");
  if (!input.sector) missing.push("sector");
  if (missing.length) return { status: 400, body: { error: `Revisa: ${missing.join(", ")}.` } };

  const startMs = Date.parse(input.start) || 0;
  const { start, ...rest } = input;
  const booking: Booking = {
    id: randomUUID(),
    starts_at: new Date(startMs).toISOString(),
    ends_at: new Date(startMs + BOOKING.slotMinutes * 60000).toISOString(),
    ...rest,
    status: "confirmed",
    created_at: new Date().toISOString(),
  };

  try {
    if (!isValidSlot(start, await blockedDates())) {
      return { status: 409, body: { error: "Ese horario ya no está disponible. Elige otro." } };
    }
    if (await hasUpcomingBooking(input.email)) {
      return {
        status: 409,
        body: { error: "Ya tienes una llamada reservada con este email. Escríbenos si necesitas cambiarla." },
      };
    }
    await createBooking(booking);
  } catch (err) {
    if (err instanceof SlotTakenError) {
      return { status: 409, body: { error: "Alguien acaba de reservar ese hueco. Elige otro." } };
    }
    console.error("[bookings]", err);
    return { status: err instanceof NotConfiguredError ? 503 : 500, body: { error: "No se pudo guardar la reserva." } };
  }

  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-ES", { timeZone: BOOKING.timeZone, ...o }).format(startMs);
  const city = BOOKING.timeZone.split("/").pop()!.replace("_", " ");
  const whenText = `${fmt({ weekday: "long", day: "numeric", month: "long" })} a las ${fmt({ hour: "2-digit", minute: "2-digit" })} (hora de ${city})`;

  await notifyBooking({ ...booking, whenText });

  return {
    status: 200,
    body: { ok: true, booking: { id: booking.id, start: booking.starts_at, end: booking.ends_at, name: booking.name } },
  };
}
