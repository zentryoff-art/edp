"use client";

import "./BookingCalendar.css";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Scale } from "./Scale";
import { CONTACT } from "@/lib/contact";
import { executeRecaptcha, preloadRecaptcha } from "@/lib/recaptcha-client";

type Slot = { start: string; time: string; available: boolean };
type Day = { date: string; weekday: number; slots: Slot[] };
type Api = { timeZone: string; slotMinutes: number; days: Day[] };
type Confirmed = { id: string; start: string; end: string; name: string };

const DEFAULT_TZ = "Europe/Madrid";
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];


const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const ymd = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function icsStamp(iso: string) {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function calendarLinks(b: Confirmed) {
  const title = "Llamada con Estudio Digital Pro";
  const details = "Llamada de 20 minutos para revisar tu captación de clientes. Te llamamos al teléfono que nos dejaste.";
  const google =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${icsStamp(b.start)}/${icsStamp(b.end)}` +
    `&details=${encodeURIComponent(details)}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Estudio Digital Pro//Reservas//ES",
    "BEGIN:VEVENT",
    `UID:${b.id}@estudiodigitalpro.com`,
    `DTSTAMP:${icsStamp(new Date().toISOString())}`,
    `DTSTART:${icsStamp(b.start)}`,
    `DTEND:${icsStamp(b.end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${details}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${title}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return { google, ics: `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}` };
}

/** En el área de clientes ya sabemos quién reserva: solo se pide teléfono y tema. */
export type PortalBooker = { name: string; company: string; email: string; phone?: string };

export function BookingCalendar({
  endpoint = "/api/bookings",
  portal,
  onBooked,
}: {
  endpoint?: string;
  portal?: PortalBooker;
  onBooked?: () => void;
} = {}) {
  const [data, setData] = useState<Api | null>(null);
  const [loadError, setLoadError] = useState("");
  const [cursor, setCursor] = useState<{ y: number; m: number } | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [step, setStep] = useState<"pick" | "form" | "done">("pick");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const [userTz, setUserTz] = useState<string | null>(null);

  // Zona horaria de la agenda: la que devuelve el servidor (BOOKING_TIMEZONE).
  const TZ = data?.timeZone || DEFAULT_TZ;
  const tzCity = TZ.split("/").pop()!.replace("_", " ");
  const { fmtLong, fmtTime } = useMemo(
    () => ({
      fmtLong: new Intl.DateTimeFormat("es-ES", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }),
      fmtTime: new Intl.DateTimeFormat("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }),
    }),
    [TZ],
  );
  const tzDiffers = useMemo(() => {
    if (!userTz) return false;
    const probe = new Date();
    const f = (tz: string) => new Intl.DateTimeFormat("es-ES", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(probe);
    return f(userTz) !== f(TZ);
  }, [userTz, TZ]);

  const load = useCallback(async (keepSelection = false) => {
    setLoadError("");
    try {
      const res = await fetch("/api/slots", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo cargar la agenda.");
      setData(json);
      const firstOpen = (json.days as Day[]).find((d) => d.slots.some((s) => s.available));
      if (firstOpen && !keepSelection) {
        const [y, m] = firstOpen.date.split("-").map(Number);
        setCursor({ y, m: m - 1 });
        setDate(firstOpen.date);
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "No se pudo cargar la agenda.");
    }
  }, []);

  useEffect(() => {
    load();
    setUserTz(Intl.DateTimeFormat().resolvedOptions().timeZone || null);
  }, [load]);

  const byDate = useMemo(() => new Map((data?.days || []).map((d) => [d.date, d])), [data]);

  const monthBounds = useMemo(() => {
    if (!data?.days.length) return null;
    const [fy, fm] = data.days[0].date.split("-").map(Number);
    const [ly, lm] = data.days[data.days.length - 1].date.split("-").map(Number);
    return { min: fy * 12 + fm - 1, max: ly * 12 + lm - 1 };
  }, [data]);

  const grid = useMemo(() => {
    if (!cursor) return [];
    const first = new Date(Date.UTC(cursor.y, cursor.m, 1));
    const lead = (first.getUTCDay() + 6) % 7; // lunes = 0
    const count = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
    const cells: (null | { d: number; key: string })[] = Array(lead).fill(null);
    for (let d = 1; d <= count; d++) cells.push({ d, key: ymd(cursor.y, cursor.m, d) });
    return cells;
  }, [cursor]);

  const selectedDay = date ? byDate.get(date) : undefined;
  const morning = selectedDay?.slots.filter((s) => s.time < "15:00") || [];
  const afternoon = selectedDay?.slots.filter((s) => s.time >= "15:00") || [];

  function moveMonth(delta: number) {
    if (!cursor || !monthBounds) return;
    const idx = cursor.y * 12 + cursor.m + delta;
    if (idx < monthBounds.min || idx > monthBounds.max) return;
    setCursor({ y: Math.floor(idx / 12), m: idx % 12 });
  }

  function localHint(iso: string) {
    if (!userTz) return null;
    const local = new Intl.DateTimeFormat("es-ES", { timeZone: userTz, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
    return local === fmtTime.format(new Date(iso)) ? null : local;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!slot) return;
    setSending(true);
    setError("");
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const recaptchaToken = await executeRecaptcha("booking_submit");
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, start: slot.start, recaptcha_token: recaptchaToken }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409 && !String(json.error || "").startsWith("Ya tienes")) {
        setError(json.error);
        setSlot(null);
        setStep("pick");
        await load(true);
        return;
      }
      if (!res.ok) throw new Error(json.error || "No se pudo reservar.");
      setConfirmed(json.booking);
      setStep("done");
      onBooked?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reservar.");
    } finally {
      setSending(false);
    }
  }

  // ── Confirmación ───────────────────────────
  if (step === "done" && confirmed) {
    const links = calendarLinks(confirmed);
    const when = new Date(confirmed.start);
    return (
      <div className="bk bk-done" role="status">
        <Scale score={5} size={22} gap={4} label="" />
        <p className="eyebrow">Reserva confirmada</p>
        <h3 className="display bk-done-title">
          {cap(fmtLong.format(when))}, a las {fmtTime.format(when)}.
        </h3>
        <p className="body-serif">
          Gracias, {confirmed.name.split(" ")[0]}. Te llamamos al teléfono que nos has dejado. Son 20 minutos: vemos
          cómo captas clientes hoy y te decimos, con cifras, qué cambiaríamos.
        </p>
        <div className="bk-done-actions">
          <a className="btn btn-ink" href={links.google} target="_blank" rel="noopener noreferrer">
            Añadir a Google Calendar
          </a>
          <a className="link" href={links.ics} download="llamada-estudio-digital-pro.ics">
            Descargar .ics (Outlook, Apple)
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bk">
      {/* ── Paso 1 · día y hora ─────────────── */}
      <div className={`bk-pick ${step === "form" ? "is-collapsed" : ""}`}>
        <div className="bk-cal">
          <div className="bk-cal-head">
            <span className="bk-month">{cursor ? `${cap(MONTHS[cursor.m])} ${cursor.y}` : "Cargando…"}</span>
            <span className="bk-nav">
              <button
                type="button"
                aria-label="Mes anterior"
                onClick={() => moveMonth(-1)}
                disabled={!cursor || !monthBounds || cursor.y * 12 + cursor.m <= monthBounds.min}
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Mes siguiente"
                onClick={() => moveMonth(1)}
                disabled={!cursor || !monthBounds || cursor.y * 12 + cursor.m >= monthBounds.max}
              >
                →
              </button>
            </span>
          </div>

          <div className="bk-grid" role="grid" aria-label="Elige un día">
            {WEEKDAYS.map((w) => (
              <span key={w} className="bk-wd" aria-hidden>
                {w}
              </span>
            ))}
            {grid.map((c, i) => {
              if (!c) return <span key={`e${i}`} />;
              const day = byDate.get(c.key);
              const open = day?.slots.some((s) => s.available);
              const free = day?.slots.filter((s) => s.available).length || 0;
              return (
                <button
                  key={c.key}
                  type="button"
                  className={`bk-day ${open ? "is-open" : ""} ${date === c.key ? "is-selected" : ""}`}
                  disabled={!open}
                  aria-pressed={date === c.key}
                  aria-label={`${c.d} de ${MONTHS[cursor!.m]}${open ? `, ${free} huecos libres` : ", sin huecos"}`}
                  onClick={() => {
                    setDate(c.key);
                    setSlot(null);
                    setError("");
                  }}
                >
                  <span className="tabular">{c.d}</span>
                  {open && <i aria-hidden />}
                </button>
              );
            })}
          </div>

          <p className="bk-tz mono">
            Hora de {tzCity} · llamadas de {data?.slotMinutes ?? 20} min
            {tzDiffers && userTz && <> · debajo, tu hora ({userTz.replace("_", " ")})</>}
          </p>
        </div>

        <div className="bk-slots">
          {loadError ? (
            <div className="bk-empty">
              <p>{loadError}</p>
              <button type="button" className="link" onClick={() => load()}>
                Reintentar
              </button>
            </div>
          ) : !data ? (
            <div className="bk-skeleton" aria-busy="true" aria-label="Cargando horarios">
              {Array.from({ length: 8 }).map((_, i) => (
                <span key={i} />
              ))}
            </div>
          ) : !selectedDay ? (
            <div className="bk-empty">
              <p>No quedan huecos libres en las próximas semanas. Escríbenos a {CONTACT.email} o llámanos al {CONTACT.phoneDisplay}.</p>
            </div>
          ) : (
            <>
              <p className="bk-day-title">{cap(fmtLong.format(new Date(selectedDay.slots[0].start)))}</p>
              {[
                ["Mañana", morning],
                ["Tarde", afternoon],
              ].map(([label, list]) =>
                (list as Slot[]).length ? (
                  <div key={label as string} className="bk-group">
                    <span className="bk-group-label mono">{label as string}</span>
                    <div className="bk-times">
                      {(list as Slot[]).map((s) => (
                        <button
                          key={s.start}
                          type="button"
                          className={`bk-time tabular ${slot?.start === s.start ? "is-selected" : ""}`}
                          disabled={!s.available}
                          aria-pressed={slot?.start === s.start}
                          onClick={() => {
                            setSlot(s);
                            setError("");
                          }}
                        >
                          {s.time}
                          {localHint(s.start) && <small>{localHint(s.start)}</small>}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null,
              )}
              {error && step === "pick" && (
                <p className="bk-error" role="alert">
                  {error}
                </p>
              )}
              <button
                type="button"
                className="btn btn-accent bk-next"
                disabled={!slot}
                onClick={() => setStep("form")}
              >
                {slot ? `Continuar con las ${slot.time}` : "Elige una hora"} <span className="arrow">→</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Paso 2 · datos ──────────────────── */}
      {step === "form" && slot && (
        <form className="bk-form" onSubmit={onSubmit} onFocusCapture={preloadRecaptcha}>
          <div className="bk-summary">
            <div>
              <span className="mono muted">Tu llamada</span>
              <strong>
                {cap(fmtLong.format(new Date(slot.start)))} · {slot.time}
              </strong>
            </div>
            <button type="button" className="link" onClick={() => setStep("pick")}>
              Cambiar
            </button>
          </div>

{portal ? (
          <div className="bk-fields">
            <label className="bk-field">
              <span>Teléfono · te llamamos aquí</span>
              <input name="phone" type="tel" required autoComplete="tel" minLength={9} defaultValue={portal.phone} />
            </label>
            <div className="bk-field">
              <span>Reserva a nombre de</span>
              <strong className="bk-who">
                {portal.name} · {portal.company}
              </strong>
            </div>
            <label className="bk-field bk-wide">
              <span>¿De qué quieres hablar?</span>
              <textarea name="notes" rows={3} required placeholder="Ej.: revisar el informe de septiembre, subir presupuesto en Meta…" />
            </label>
          </div>
          ) : (
          <div className="bk-fields">
            <label className="bk-field">
              <span>Nombre</span>
              <input name="name" required autoComplete="name" />
            </label>
            <label className="bk-field">
              <span>Empresa</span>
              <input name="company" required autoComplete="organization" />
            </label>
            <label className="bk-field">
              <span>Email</span>
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label className="bk-field">
              <span>Teléfono · te llamamos aquí</span>
              <input name="phone" type="tel" required autoComplete="tel" minLength={9} />
            </label>
            <label className="bk-field">
              <span>Sector</span>
              <select name="sector" required defaultValue="">
                <option value="" disabled>
                  Elige uno
                </option>
                <option>Servicios a domicilio / reformas</option>
                <option>Clínica o centro</option>
                <option>Servicios profesionales / B2B</option>
                <option>Formación / academia</option>
                <option>Otro</option>
              </select>
            </label>
            <label className="bk-field">
              <span>Inversión mensual en anuncios</span>
              <select name="ad_spend" required defaultValue="">
                <option value="" disabled>
                  Elige una
                </option>
                <option>Aún no invierto</option>
                <option>Menos de 500 €</option>
                <option>500 – 1.500 €</option>
                <option>1.500 – 5.000 €</option>
                <option>Más de 5.000 €</option>
              </select>
            </label>
            <label className="bk-field bk-wide">
              <span>
                Web <em>opcional</em>
              </span>
              <input name="website" inputMode="url" placeholder="tuempresa.com" autoComplete="url" />
            </label>
            <label className="bk-field bk-wide">
              <span>
                ¿Qué quieres resolver? <em>opcional</em>
              </span>
              <textarea name="notes" rows={3} />
            </label>
            <input type="text" name="web_hp" tabIndex={-1} autoComplete="off" className="hp" aria-hidden />
          </div>
          )}

          {error && (
            <p className="bk-error" role="alert">
              {error}
            </p>
          )}

          <div className="bk-submit">
            <button className="btn btn-accent" type="submit" disabled={sending}>
              {sending ? "Reservando…" : "Confirmar llamada"} <span className="arrow">→</span>
            </button>
            <p className="muted">Sin coste ni compromiso. Usamos tus datos solo para esta llamada.</p>
          </div>
        </form>
      )}
    </div>
  );
}
