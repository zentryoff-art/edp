"use server";

import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession, requireMember } from "@/lib/portal/data";
import { portalMode, SESSION_COOKIE } from "@/lib/firebase/auth";
import { getDb, getFirebaseAuth } from "@/lib/firebase/admin";
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

// ── Acceso con Firebase ──────────────────────────

export async function createSessionFromIdToken(idToken: string, nextUrl: string) {
  try {
    const auth = getFirebaseAuth();
    // Cookie de sesión de 5 días
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return { ok: true, next: safeNext(nextUrl) };
  } catch (e) {
    console.error("[portal] session create error", e);
    return { error: "No se pudo iniciar sesión." };
  }
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/clientes/login");
}

export async function requestReset(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email", 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Escribe un email válido." };
  const done: FormState = { ok: "Si ese email tiene acceso, te hemos enviado un enlace para cambiar la contraseña." };
  if (portalMode !== "firebase") return done;

  try {
    const auth = getFirebaseAuth();
    const link = await auth.generatePasswordResetLink(email);
    if (mailConfigured) {
      await sendAccessLink(email, link, "recovery");
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

  const session = await getSession();
  if (!session?.userId) {
    return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };
  }

  try {
    const auth = getFirebaseAuth();
    await auth.updateUser(session.userId, { password });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    return { error: msg || "No se pudo actualizar la contraseña." };
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

  const db = getDb();
  const now = new Date().toISOString();
  const incidentRef = db.collection("incidents").doc();
  const id = incidentRef.id;

  try {
    await incidentRef.set({
      client_id: me.client.id,
      created_by: me.userId,
      title,
      description,
      category,
      priority,
      status: "abierta",
      created_at: now,
      updated_at: now,
    });

    if (description) {
      await db.collection("incident_messages").add({
        incident_id: id,
        author_id: me.userId,
        author_name: me.fullName || me.email,
        is_team: false,
        body: description,
        created_at: now,
      });
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
  } catch (error) {
    console.error("[portal] incident", error);
    return { error: "No se pudo crear la incidencia. Inténtalo de nuevo." };
  }

  redirect(`/clientes/incidencias/${id}?nueva=1`);
}

export async function replyIncident(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireMember();
  const incidentId = str(fd, "incident_id", 64);
  const body = str(fd, "body", 5000);
  if (!body) return { error: "Escribe un mensaje." };

  const db = getDb();
  const incidentRef = db.collection("incidents").doc(incidentId);
  const incDoc = await incidentRef.get();
  if (!incDoc.exists) return { error: "Incidencia no encontrada." };

  const incData = incDoc.data()!;
  const title = incData.title;
  const now = new Date().toISOString();

  try {
    await db.collection("incident_messages").add({
      incident_id: incidentId,
      author_id: me.userId,
      author_name: me.fullName || me.email,
      is_team: false,
      body,
      created_at: now,
    });

    await incidentRef.update({ updated_at: now });

    await notifyIncidentReply({
      incidentId,
      client: me.client.name,
      author: me.fullName || me.email,
      authorEmail: me.email,
      title,
      body,
    });

    revalidatePath(`/clientes/incidencias/${incidentId}`);
    return { ok: "Mensaje enviado." };
  } catch (error) {
    console.error("[portal] reply", error);
    return { error: "No se pudo enviar el mensaje." };
  }
}

/** Usado por la página /clientes/sin-acceso. */
export async function currentEmail() {
  return (await getSession())?.email || "";
}
