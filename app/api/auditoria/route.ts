import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createContactRequest, NotConfiguredError } from "@/lib/bookings";
import { notifyContactRequest } from "@/lib/mail";
import { verifyRecaptcha } from "@/lib/recaptcha-server";
import { sendMetaCapiEvent } from "@/lib/meta-capi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(v: unknown, max = 500) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Petición no válida." }, { status: 400 });
  }

  // Campo trampa: si viene relleno, es un bot. Respondemos ok sin hacer nada.
  if (clean(body.web)) return NextResponse.json({ ok: true });

  // Verificación de seguridad con Google reCAPTCHA v3
  const recaptcha = await verifyRecaptcha({
    token: body.recaptcha_token,
    action: "audit_submit",
    minScore: 0.5,
  });
  if (!recaptcha.success) {
    return NextResponse.json(
      { error: recaptcha.error || "Fallo en la verificación de seguridad." },
      { status: 400 }
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || undefined;
  const userAgent = req.headers.get("user-agent") || undefined;
  const attribution = typeof body.attribution === "object" && body.attribution ? (body.attribution as Record<string, unknown>) : undefined;

  const lead = {
    id: randomUUID(),
    name: clean(body.nombre, 120),
    company: clean(body.empresa, 160),
    email: clean(body.email, 200).toLowerCase(),
    phone: clean(body.telefono, 40),
    sector: clean(body.sector, 80),
    message: clean(body.mensaje, 2000),
    source: "web/mes-de-prueba",
    created_at: new Date().toISOString(),
    attribution,
    client_ip: ip,
    client_user_agent: userAgent,
  };

  if (!lead.name || !lead.company || !lead.sector || !EMAIL_RE.test(lead.email)) {
    return NextResponse.json({ error: "Revisa nombre, empresa, email y sector." }, { status: 400 });
  }

  try {
    await createContactRequest(lead);
  } catch (err) {
    console.error("[auditoria]", err);
    const status = err instanceof NotConfiguredError ? 503 : 500;
    return NextResponse.json({ error: "No se pudo enviar." }, { status });
  }

  await notifyContactRequest(lead);

  // Disparo silencioso de Meta CAPI en servidor (se ejecuta solo si hay claves en Vercel)
  const attr = (attribution || {}) as Record<string, string>;
  void sendMetaCapiEvent({
    eventName: "Lead",
    eventId: lead.id,
    eventSourceUrl: "https://estudiodigitalpro.com",
    user: {
      email: lead.email,
      phone: lead.phone,
      name: lead.name,
      company: lead.company,
      ip,
      userAgent,
      fbp: attr.fbp,
      fbc: attr.fbc,
    },
    customData: {
      content_name: "Auditoría de Captación",
      sector: lead.sector,
    },
  });

  return NextResponse.json({ ok: true });
}
