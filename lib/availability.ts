/**
 * Disponibilidad para llamadas. Todo se configura con variables de entorno
 * (ver .env.example); el horario se expresa en la zona BOOKING_TIMEZONE y
 * la API trabaja en UTC (ISO).
 */

function parseHours(spec: string): Record<number, [string, string][]> {
  // "1-4=09:00-14:00,16:00-19:00;5=09:00-14:00"
  const out: Record<number, [string, string][]> = {};
  for (const part of spec.split(";").map((s) => s.trim()).filter(Boolean)) {
    const [days, ranges] = part.split("=");
    const [a, b] = days.split("-").map(Number);
    const windows = ranges.split(",").map((r) => r.trim().split("-") as [string, string]);
    for (let d = a; d <= (b ?? a); d++) out[d % 7] = windows;
  }
  return out;
}

const env = process.env;

export const BOOKING = {
  timeZone: env.BOOKING_TIMEZONE || "Europe/Madrid",
  slotMinutes: Number(env.BOOKING_SLOT_MINUTES || 20),
  /** Franjas por día de la semana (0 = domingo … 6 = sábado), en hora local. */
  hours: parseHours(env.BOOKING_HOURS || "1-4=09:00-14:00,16:00-19:00;5=09:00-14:00"),
  minNoticeMinutes: Number(env.BOOKING_MIN_NOTICE_MINUTES || 120),
  horizonDays: Number(env.BOOKING_HORIZON_DAYS || 28),
  /** Días cerrados fijos (YYYY-MM-DD). Los de la tabla `blocked_dates` de Supabase se suman a estos. */
  closedDates: (env.BOOKING_CLOSED_DATES || "").split(",").map((s) => s.trim()).filter(Boolean),
};

export type Slot = { start: string; time: string; available: boolean };
export type Day = { date: string; weekday: number; slots: Slot[] };

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: BOOKING.timeZone,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function zonedParts(ms: number) {
  const p = Object.fromEntries(partsFmt.formatToParts(ms).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, s: +p.second };
}

/** Diferencia en minutos entre la hora local de la zona y UTC en ese instante. */
function offsetMinutes(ms: number) {
  const p = zonedParts(ms);
  return (Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(ms / 1000) * 1000) / 60000;
}

/** Hora local de la zona → instante UTC (ms). */
export function zonedToUtc(y: number, m: number, d: number, h: number, min: number) {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const off1 = offsetMinutes(guess);
  const t = guess - off1 * 60000;
  const off2 = offsetMinutes(t);
  return off1 === off2 ? t : guess - off2 * 60000;
}

export function localDate(ms: number) {
  const p = zonedParts(ms);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

export function localTime(ms: number) {
  const p = zonedParts(ms);
  return `${String(p.h).padStart(2, "0")}:${String(p.min).padStart(2, "0")}`;
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Todos los huecos que el horario permite (sin mirar reservas). */
export function buildDays(extraClosed: string[] = [], now = Date.now()): Day[] {
  const closed = new Set([...BOOKING.closedDates, ...extraClosed]);
  const earliest = now + BOOKING.minNoticeMinutes * 60000;
  const today = zonedParts(now);
  const days: Day[] = [];

  for (let i = 0; i <= BOOKING.horizonDays; i++) {
    const cal = new Date(Date.UTC(today.y, today.m - 1, today.d + i));
    const y = cal.getUTCFullYear();
    const m = cal.getUTCMonth() + 1;
    const d = cal.getUTCDate();
    const weekday = cal.getUTCDay();
    const date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    const windows = BOOKING.hours[weekday];
    if (!windows || closed.has(date)) continue;

    const slots: Slot[] = [];
    for (const [from, to] of windows) {
      for (let t = toMin(from); t + BOOKING.slotMinutes <= toMin(to); t += BOOKING.slotMinutes) {
        const start = zonedToUtc(y, m, d, Math.floor(t / 60), t % 60);
        if (start < earliest) continue;
        slots.push({
          start: new Date(start).toISOString(),
          time: `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`,
          available: true,
        });
      }
    }
    if (slots.length) days.push({ date, weekday, slots });
  }
  return days;
}

/** ¿Es este instante un hueco válido del horario ahora mismo? */
export function isValidSlot(startIso: string, extraClosed: string[] = [], now = Date.now()) {
  return buildDays(extraClosed, now).some((d) => d.slots.some((s) => s.start === startIso));
}
