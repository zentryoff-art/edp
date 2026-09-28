import { NextResponse } from "next/server";
import { clean, processBooking, rateLimited } from "@/lib/booking-core";
import { getSession } from "@/lib/portal/data";

/** Reserva desde el área de clientes: los datos del cliente salen de la sesión, no del formulario. */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s?.member) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  if (rateLimited(req)) return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Petición no válida." }, { status: 400 });
  }

  const m = s.member;
  const notes = clean(body.notes, 1500);
  const { status, body: out } = await processBooking({
    start: clean(body.start, 40),
    name: m.fullName || m.email,
    company: m.client.name,
    email: m.email,
    phone: clean(body.phone, 40),
    sector: m.client.sector || "Cliente",
    ad_spend: "",
    website: "",
    notes,
    source: "portal",
    client_id: m.client.id,
    user_id: m.userId,
  });

  return NextResponse.json(out, { status });
}
