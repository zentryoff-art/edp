import { NextResponse } from "next/server";
import { clean, processBooking, rateLimited } from "@/lib/booking-core";
import { verifyRecaptcha } from "@/lib/recaptcha-server";

export async function POST(req: Request) {
  if (rateLimited(req)) {
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Petición no válida." }, { status: 400 });
  }

  if (clean(body.web_hp)) return NextResponse.json({ ok: true }); // bot

  // Verificación de seguridad con Google reCAPTCHA v3
  const recaptcha = await verifyRecaptcha({
    token: body.recaptcha_token,
    action: "booking_submit",
    minScore: 0.5,
  });
  if (!recaptcha.success) {
    return NextResponse.json(
      { error: recaptcha.error || "Fallo en la verificación de seguridad." },
      { status: 400 }
    );
  }

  const { status, body: out } = await processBooking({
    start: clean(body.start, 40),
    name: clean(body.name, 120),
    company: clean(body.company, 160),
    email: clean(body.email, 200).toLowerCase(),
    phone: clean(body.phone, 40),
    sector: clean(body.sector, 80),
    ad_spend: clean(body.ad_spend, 60),
    website: clean(body.website, 200),
    notes: clean(body.notes, 1500),
    source: "web/llamada",
  });
  return NextResponse.json(out, { status });
}
