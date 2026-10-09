"use client";

import { useState, type FormEvent } from "react";
import { CONTACT } from "@/lib/contact";
import { executeRecaptcha, preloadRecaptcha } from "@/lib/recaptcha-client";

type Status = "idle" | "sending" | "sent" | "error";

export function AuditForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setStatus("sending");
    setError("");
    try {
      // Obtener token reCAPTCHA v3 bajo demanda sin degradar la carga inicial de la web
      const recaptchaToken = await executeRecaptcha("audit_submit");
      data.recaptcha_token = recaptchaToken;

      const res = await fetch("/api/auditoria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "No se pudo enviar.");
      setStatus("sent");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "No se pudo enviar.");
    }
  }

  if (status === "sent") {
    return (
      <div className="form-done" role="status">
        <p className="eyebrow">Recibido</p>
        <p className="display h3">Gracias. Te respondemos muy pronto.</p>
        <p className="body-serif muted">
          Te contesta el fundador con un plan para tu negocio y una fecha para arrancar tu mes de prueba.
        </p>
      </div>
    );
  }

  return (
    <form className="audit-form" onSubmit={onSubmit} onFocusCapture={preloadRecaptcha} noValidate={false}>
      <div className="field">
        <label htmlFor="f-name">Nombre</label>
        <input id="f-name" name="nombre" required autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="f-company">Empresa</label>
        <input id="f-company" name="empresa" required autoComplete="organization" />
      </div>
      <div className="field">
        <label htmlFor="f-email">Email</label>
        <input id="f-email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="f-phone">
          Teléfono <span className="opt">opcional</span>
        </label>
        <input id="f-phone" name="telefono" type="tel" autoComplete="tel" />
      </div>
      <div className="field field-wide">
        <label htmlFor="f-sector">Sector</label>
        <select id="f-sector" name="sector" required defaultValue="">
          <option value="" disabled>
            Elige uno
          </option>
          <option>Servicios a domicilio / reformas</option>
          <option>Clínica o centro</option>
          <option>Servicios profesionales / B2B</option>
          <option>Formación / academia</option>
          <option>Otro</option>
        </select>
      </div>
      <div className="field field-wide">
        <label htmlFor="f-msg">
          ¿A qué te dedicas y qué inviertes hoy en anuncios? <span className="opt">opcional</span>
        </label>
        <textarea id="f-msg" name="mensaje" rows={3} />
      </div>
      {/* Campo trampa para bots */}
      <input type="text" name="web" tabIndex={-1} autoComplete="off" className="hp" aria-hidden />

      <div className="form-foot field-wide">
        <button className="btn btn-accent" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Enviando…" : "Quiero mi mes de prueba"} <span className="arrow">→</span>
        </button>
        <p className="form-note">
          Sin permanencia. Solo pagas la publicidad. Usamos tus datos solo para responderte.
        </p>
      </div>
      {status === "error" && (
        <p className="form-error field-wide" role="alert">
          {error} Inténtalo de nuevo, escríbenos a {CONTACT.email} o llámanos al {CONTACT.phoneDisplay}.
        </p>
      )}
    </form>
  );
}
