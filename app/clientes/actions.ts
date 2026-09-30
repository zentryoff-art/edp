"use server";

import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession, requireMember } from "@/lib/portal/data";
import { portalMode, SESSION_COOKIE } from "@/lib/firebase/auth";
import { getDb, getFirebaseAuth } from "@/lib/firebase/admin";
import { INCIDENT_CATEGORIES, INCIDENT_PRIORITIES, type QualificationServiceKey, type PriceRangeKey, type CommercialActionStatus } from "@/lib/portal/types";
import { computeLeadSignals } from "@/lib/portal/qualification";
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

export async function signIn(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email", 200).toLowerCase();
  const password = str(fd, "password", 200);
  const next = safeNext(str(fd, "next", 200));

  if (!email || !password) return { error: "Escribe tu email y tu contraseña." };

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return { error: "Falta configurar NEXT_PUBLIC_FIREBASE_API_KEY." };

  try {
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok) {
      const msg = verifyData.error?.message || "";
      if (
        msg.includes("EMAIL_NOT_FOUND") ||
        msg.includes("INVALID_PASSWORD") ||
        msg.includes("INVALID_LOGIN_CREDENTIALS")
      ) {
        return { error: "Email o contraseña incorrectos." };
      }
      if (msg.includes("TOO_MANY_ATTEMPTS_TRY_LATER")) {
        return { error: "Demasiados intentos. Espera unos minutos." };
      }
      return { error: "Error al iniciar sesión." };
    }

    const idToken = verifyData.idToken;
    const auth = getFirebaseAuth();
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 días
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest: unknown }).digest === "string" && (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("[portal] login error", err);
    return { error: "Error de conexión o autenticación." };
  }

  redirect(next);
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

// ── Calificación y Estado de Leads (Modelo Reactivo / Worker Hermes) ──────────────

export async function updateLeadAction(data: {
  leadId: string;
  contactName?: string;
  service?: QualificationServiceKey | string;
  hasStorage?: boolean;
  hasElevator?: boolean;
  priceRange?: PriceRangeKey | null;
  status: CommercialActionStatus | "cerrado" | "activo";
  saleAmount?: number;
  // retrocompatibilidad
  score?: number;
  serviceType?: string;
}) {
  try {
    const s = await getSession();
    if (!s?.member) {
      return { error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
    }
    const me = s.member;
    const db = getDb();
    const leadRef = db.collection("leads").doc(data.leadId);
    const snap = await leadRef.get();

    if (!snap.exists) {
      return { error: "Lead no encontrado." };
    }

    const existing = snap.data()!;
    if (existing.client_id !== me.client.id) {
      return { error: "No autorizado." };
    }

    const now = new Date().toISOString();
    const existingQual = existing.qualification;
    const alreadyQualified = Boolean(existingQual?.service || existing.score);

    // Mapear status a convención ("en_conversacion" | "rechazado" | "venta")
    const rawStatus = data.status === "cerrado" ? "venta" : data.status;
    const commercialStatus: CommercialActionStatus =
      rawStatus === "venta" || rawStatus === "rechazado" ? rawStatus : "en_conversacion";

    // Si ya estaba calificado, los hechos operativos (servicio, guardamuebles, elevador, rango) quedan inmutables
    const serviceKey = (alreadyQualified && existingQual?.service
      ? existingQual.service
      : (data.service as QualificationServiceKey) || "mudanza_mediana") as QualificationServiceKey;

    const hasStorage = alreadyQualified && existingQual ? Boolean(existingQual.has_storage) : Boolean(data.hasStorage);
    const hasElevator = alreadyQualified && existingQual ? Boolean(existingQual.has_elevator) : Boolean(data.hasElevator);
    const priceRange = alreadyQualified && existingQual ? existingQual.price_range : data.priceRange || null;

    const saleAmount = commercialStatus === "venta" && data.saleAmount ? Number(data.saleAmount) : 0;

    // Calcular señales automatizadas (sin sesgo humano) y cola de sincronización
    const { computed_signals, sync } = computeLeadSignals({
      service: serviceKey,
      has_storage: hasStorage,
      has_elevator: hasElevator,
      price_range: priceRange,
      status: commercialStatus,
      sale_amount: saleAmount,
      client_id: me.client.id,
      channel: existing.channel || "google_lsa",
    });

    const qualificationPayload = {
      service: serviceKey,
      has_storage: hasStorage,
      has_elevator: hasElevator,
      price_range: priceRange,
      status: commercialStatus,
      sale_amount: saleAmount,
      qualified_at: existingQual?.qualified_at || now,
    };

    const updatePayload: Record<string, any> = {
      qualification: qualificationPayload,
      computed_signals,
      sync,
      // Estados normalizados
      status: commercialStatus === "venta" ? "cerrado" : commercialStatus,
      score: computed_signals.internal_rating,
      service_type: serviceKey,
      updated_at: now,
    };

    if (commercialStatus === "venta") {
      updatePayload.sale_amount = saleAmount;
    }

    if (typeof data.contactName === "string" && data.contactName.trim()) {
      updatePayload.contact_name = data.contactName.trim();
    }

    await leadRef.update(updatePayload);
    revalidatePath("/clientes/leads");
    return { ok: true, qualification: qualificationPayload, computed_signals, sync };
  } catch (err: unknown) {
    console.error("[portal] updateLeadAction error:", err);
    const message = err instanceof Error ? err.message : "Error al actualizar el lead";
    return { error: message };
  }
}

