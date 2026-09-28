"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { createIncident, replyIncident, requestReset, setPassword, signIn, type FormState } from "@/app/clientes/actions";
import { BookingCalendar, type PortalBooker } from "@/components/BookingCalendar";
import { INCIDENT_CATEGORIES, INCIDENT_PRIORITIES } from "@/lib/portal/types";

function Submit({ children, pending: label }: { children: React.ReactNode; pending: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-accent pc-submit" type="submit" disabled={pending}>
      {pending ? label : children}
    </button>
  );
}

function Message({ state }: { state: FormState }) {
  if (state?.error)
    return (
      <p className="pc-msg is-error" role="alert">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p className="pc-msg is-ok" role="status">
        {state.ok}
      </p>
    );
  return null;
}

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="pc-form">
      <input type="hidden" name="next" value={next} />
      <label className="pc-field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="username" required autoFocus />
      </label>
      <label className="pc-field">
        <span>Contraseña</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <Message state={state} />
      <Submit pending="Entrando…">
        Entrar <span className="arrow">→</span>
      </Submit>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(requestReset, undefined);
  if (state?.ok) return <Message state={state} />;
  return (
    <form action={action} className="pc-form">
      <label className="pc-field">
        <span>Email de tu cuenta</span>
        <input name="email" type="email" autoComplete="email" required autoFocus />
      </label>
      <Message state={state} />
      <Submit pending="Enviando…">Enviar enlace</Submit>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(setPassword, undefined);
  return (
    <form action={action} className="pc-form">
      <label className="pc-field">
        <span>Nueva contraseña · mínimo 10 caracteres</span>
        <input name="password" type="password" autoComplete="new-password" minLength={10} required autoFocus />
      </label>
      <label className="pc-field">
        <span>Repítela</span>
        <input name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      </label>
      <Message state={state} />
      <Submit pending="Guardando…">Guardar contraseña</Submit>
    </form>
  );
}

const CAT_LABEL: Record<string, string> = {
  campañas: "Campañas y anuncios",
  leads: "Leads y calificación",
  informes: "Informes y datos",
  facturación: "Facturación",
  web: "Web o formularios",
  otra: "Otra",
};

export function IncidentForm() {
  const [state, action] = useActionState(createIncident, undefined);
  return (
    <form action={action} className="pc-form pc-form-wide">
      <label className="pc-field pc-span-2">
        <span>¿Qué pasa?</span>
        <input name="title" required minLength={3} maxLength={160} placeholder="Ej.: me llegan leads de fuera de mi zona" autoFocus />
      </label>
      <label className="pc-field">
        <span>Categoría</span>
        <select name="category" required defaultValue="">
          <option value="" disabled>
            Elige una
          </option>
          {INCIDENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CAT_LABEL[c]}
            </option>
          ))}
        </select>
      </label>
      <label className="pc-field">
        <span>Prioridad</span>
        <select name="priority" required defaultValue="normal">
          {INCIDENT_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <label className="pc-field pc-span-2">
        <span>Detalles</span>
        <textarea name="description" rows={6} maxLength={5000} placeholder="Cuándo empezó, a qué campaña o lead afecta, capturas o enlaces…" />
      </label>
      <Message state={state} />
      <div className="pc-span-2">
        <Submit pending="Enviando…">
          Abrir incidencia <span className="arrow">→</span>
        </Submit>
      </div>
    </form>
  );
}

export function ReplyForm({ incidentId }: { incidentId: string }) {
  const [state, action] = useActionState(replyIncident, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form action={action} ref={ref} className="pc-form pc-reply">
      <input type="hidden" name="incident_id" value={incidentId} />
      <label className="pc-field">
        <span className="sr-only">Tu mensaje</span>
        <textarea name="body" rows={3} required maxLength={5000} placeholder="Escribe una respuesta…" />
      </label>
      <Message state={state} />
      <Submit pending="Enviando…">Enviar</Submit>
    </form>
  );
}

export function PortalBooking({ booker }: { booker: PortalBooker }) {
  const router = useRouter();
  return <BookingCalendar endpoint="/api/portal/bookings" portal={booker} onBooked={() => router.refresh()} />;
}
