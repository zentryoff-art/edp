"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Scale } from "@/components/Scale";
import { CONTACT } from "@/lib/contact";

function icsStamp(iso: string) {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function calendarLinks(b: { id: string; start: string; end: string; name: string }) {
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
    `UID:${b.id || "edp-reserva"}@estudiodigitalpro.com`,
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

export function ConfirmadaContent() {
  const params = useSearchParams();
  const id = params.get("id") || "";
  const start = params.get("start") || "";
  const end = params.get("end") || "";
  const name = params.get("name") || "gracias";

  const whenDate = useMemo(() => (start ? new Date(start) : new Date()), [start]);
  const endDate = useMemo(() => (end ? new Date(end) : new Date(whenDate.getTime() + 20 * 60000)), [end, whenDate]);

  const links = useMemo(() => {
    return calendarLinks({
      id,
      start: whenDate.toISOString(),
      end: endDate.toISOString(),
      name,
    });
  }, [id, whenDate, endDate, name]);

  const fmtLong = useMemo(
    () => new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long" }),
    []
  );
  const fmtTime = useMemo(
    () => new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" }),
    []
  );

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Disparo de evento cliente de Meta si el píxel está cargado
  useEffect(() => {
    if (typeof window !== "undefined" && (window as unknown as { fbq?: Function }).fbq) {
      (window as unknown as { fbq: Function }).fbq("track", "Schedule", {
        content_name: "Llamada de diagnóstico",
      });
    }
  }, []);

  return (
    <div
      style={{
        border: "1px solid var(--line, #e2dfd9)",
        background: "var(--card-bg, #fff)",
        padding: "clamp(32px, 5vw, 64px)",
      }}
    >
      <div style={{ marginBottom: "24px" }}>
        <Scale score={5} size={20} gap={4} label="" />
      </div>

      <p className="eyebrow" style={{ color: "var(--accent, #e75623)", marginBottom: "12px" }}>
        Reserva confirmada
      </p>

      <h1 className="display" style={{ fontSize: "clamp(26px, 3.8vw, 40px)", lineHeight: 1.15, marginBottom: "20px" }}>
        {start ? `${cap(fmtLong.format(whenDate))}, a las ${fmtTime.format(whenDate)}.` : "Tu llamada está reservada."}
      </h1>

      <p className="body-serif" style={{ fontSize: "18px", lineHeight: 1.6, color: "var(--body-color, #2c2822)", marginBottom: "16px" }}>
        Gracias, {name.split(" ")[0]}. Te llamaremos puntualmente al número de teléfono facilitado.
      </p>

      <p className="body-serif" style={{ fontSize: "16px", lineHeight: 1.6, color: "var(--muted, #6f6a61)", marginBottom: "32px" }}>
        Son 20 minutos dedicados: analizamos cómo captas clientes hoy, qué canales tienen mayor margen para tu empresa y te mostramos con cifras exactas qué cambiaríamos.
      </p>

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "36px",
        }}
      >
        <a className="btn btn-ink" href={links.google} target="_blank" rel="noopener noreferrer">
          Añadir a Google Calendar
        </a>
        <a className="btn btn-outline" href={links.ics} download="llamada-estudio-digital-pro.ics">
          Descargar .ics (Outlook, Apple)
        </a>
      </div>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <Link href="/" className="link" style={{ fontSize: "14px" }}>
          ← Volver al inicio
        </Link>
        <span style={{ color: "var(--line, #e2dfd9)" }}>|</span>
        <a href={`tel:${CONTACT.phone}`} className="link" style={{ fontSize: "14px" }}>
          ¿Necesitas cambiar la hora? Llámanos al {CONTACT.phoneDisplay}
        </a>
      </div>
    </div>
  );
}
