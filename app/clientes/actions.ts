"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession, requireMember } from "@/lib/portal/data";
import { portalMode, supabaseAdmin, supabaseServer } from "@/lib/portal/supabase";
import { INCIDENT_CATEGORIES, INCIDENT_PRIORITIES } from "@/lib/portal/types";
import { mailConfigured, notifyIncident, notifyIncidentReply, sendAccessLink } from "@/lib/mail";

export type FormState = { error?: string; ok?: string } | undefined;

const str = (fd: FormData, k: string, max = 5000) => String(fd.get(k) ?? "").trim().slice(0, max);

/** Solo rutas internas del área como destino tras el login. */
const safeNext = (v: string) => (/^\/clientes(\/[\w\-/]*)?$/.test(v) ? v : "/clientes");

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || "https://estudiodigitalpro.com";
}

// ── Acceso ──────────────────────────────────────

export async function signIn(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email", 200).toLowerCase();
  const password = str(fd, "password", 200);
  const next = safeNext(str(fd, "next", 200));
  if (!email || !password) return { error: "Escribe tu email y tu contraseña." };

  if (portalMode === "missing") return { error: "El área de clientes no está configurada." };

  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    if (/rate|too many/i.test(error.message)) return { error: "Demasiados intentos. Espera unos minutos." };
    return { error: "Email o contraseña incorrectos." };
  }
  redirect(next);
}

export async function signOut() {
  if (portalMode === "supabase") await (await supabaseServer()).auth.signOut();
  redirect("/clientes/login");
}

export async function requestReset(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email", 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Escribe un email válido." };
  // Misma respuesta exista o no la cuenta: no revelamos quién es cliente.
  const done: FormState = { ok: "Si ese email tiene acceso, te hemos enviado un enlace para cambiar la contraseña." };
  if (portalMode !== "supabase") return done;

  try {
    if (!mailConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Sin SMTP propio: Supabase envía el correo con su plantilla «Reset password».
      const sb = await supabaseServer();
      await sb.auth.resetPasswordForEmail(email);
      return done;
    }
    const { data, error } = await supabaseAdmin().auth.admin.generateLink({ type: "recovery", email });
    if (!error && data.properties?.hashed_token) {
      const url = `${await origin()}/clientes/auth/confirm?type=recovery&token_hash=${encodeURIComponent(data.properties.hashed_token)}`;
      await sendAccessLink(email, url, "recovery");
    }
  } catch (e) {
    console.error("[portal] reset", e);
  }
  return done;
}

export async function setPassword(_: FormState, fd: FormData): Promise<FormState> {
  const password = str(fd, "password", 200);
  const confirm = str(fd, "confirm", 200);
  if (password.length < 10) return { error: "La contraseña debe tener al menos 10 caracteres." };
  if (password !== confirm) return { error: "Las contraseñas no coinciden." };
  if (portalMode !== "supabase") return { error: "El área de clientes no está configurada." };

  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) return { error: "El enlace ha caducado. Pide uno nuevo desde «¿Has olvidado tu contraseña?»." };
  const { error } = await sb.auth.updateUser({ password });
  if (error) {
    return { error: /same|different/i.test(error.message) ? "Usa una contraseña distinta de la anterior." : "No se pudo guardar. Prueba con otra contraseña." };
  }
  redirect("/clientes?bienvenida=1");
}

// ── Incidencias ─────────────────────────────────

export async function createIncident(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireMember();
  const title = str(fd, "title", 160);
  const description = str(fd, "description", 5000);
  const category = str(fd, "category", 40);
  const priority = str(fd, "priority", 20);
  if (title.length < 3) return { error: "Pon un título de al menos 3 caracteres." };
  if (!(INCIDENT_CATEGORIES as readonly string[]).includes(category)) return { error: "Elige una categoría." };
  if (!(INCIDENT_PRIORITIES as readonly string[]).includes(priority)) return { error: "Elige una prioridad." };

  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("incidents")
    .insert({ client_id: me.client.id, created_by: me.userId, title, description, category, priority })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[portal] incident", error);
    return { error: "No se pudo crear la incidencia. Inténtalo de nuevo." };
  }
  const id = data.id;
  if (description) {
    await sb.from("incident_messages").insert({ incident_id: id, author_id: me.userId, body: description });
  }

  await notifyIncident({
    id,
    client: me.client.name,
    author: me.fullName || me.email,
    authorEmail: me.email,
    title,
    description,
    category,
    priority,
  });
  revalidatePath("/clientes", "layout");
  redirect(`/clientes/incidencias/${id}?nueva=1`);
}

export async function replyIncident(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireMember();
  const incidentId = str(fd, "incident_id", 64);
  const body = str(fd, "body", 5000);
  if (!body) return { error: "Escribe un mensaje." };

  const sb = await supabaseServer();
  const { data: inc } = await sb.from("incidents").select("title").eq("id", incidentId).maybeSingle();
  if (!inc) return { error: "Incidencia no encontrada." };
  const title = inc.title;
  const { error } = await sb.from("incident_messages").insert({ incident_id: incidentId, author_id: me.userId, body });
  if (error) {
    console.error("[portal] reply", error);
    return { error: "No se pudo enviar el mensaje." };
  }

  await notifyIncidentReply({ incidentId, client: me.client.name, author: me.fullName || me.email, authorEmail: me.email, title, body });
  revalidatePath(`/clientes/incidencias/${incidentId}`);
  return { ok: "Mensaje enviado." };
}

/** Usado por la página /clientes/sin-acceso. */
export async function currentEmail() {
  return (await getSession())?.email || "";
}
