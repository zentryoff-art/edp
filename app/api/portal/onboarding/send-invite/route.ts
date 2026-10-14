import { NextRequest, NextResponse } from "next/server";
import { sendClientOnboardingInvite } from "@/lib/mail";

/**
 * Endpoint para que el worker del VPS (Hermes) solicite el envío
 * del correo oficial de invitación y activación al nuevo cliente.
 *
 * POST /api/portal/onboarding/send-invite
 * Headers:
 *   x-internal-secret: <ONBOARDING_INTERNAL_SECRET>
 * Body JSON:
 *   {
 *     "email": "contacto@empresa.com",
 *     "name": "Nombre Contacto",
 *     "company": "Empresa S.L.",
 *     "inviteLink": "https://..."
 *   }
 */
export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get("x-internal-secret") || "";
    const expectedSecret = process.env.ONBOARDING_INTERNAL_SECRET;

    if (!expectedSecret || secretHeader !== expectedSecret) {
      return NextResponse.json(
        { ok: false, error: "No autorizado. Clave interna inválida." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { email, name, company, inviteLink } = body;

    if (!email || !inviteLink) {
      return NextResponse.json(
        { ok: false, error: "Faltan parámetros requeridos: email y inviteLink son obligatorios." },
        { status: 400 }
      );
    }

    const sent = await sendClientOnboardingInvite({
      to: String(email).trim().toLowerCase(),
      url: String(inviteLink).trim(),
      name: name ? String(name).trim() : undefined,
      company: company ? String(company).trim() : undefined,
    });

    if (!sent) {
      return NextResponse.json(
        { ok: false, error: "Error enviando correo por SMTP. Revisa la configuración de correo." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Invitación enviada con éxito a ${email}`,
    });
  } catch (err: any) {
    console.error("[api/onboarding/send-invite] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Error procesando solicitud de invitación" },
      { status: 500 }
    );
  }
}
