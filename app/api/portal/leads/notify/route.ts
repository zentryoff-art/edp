import { NextRequest, NextResponse } from "next/server";
import { sendLeadPushNotification } from "@/lib/portal/push";

/**
 * Endpoint para que el worker de Hermes o servicios externos disparen
 * la notificación push a los dispositivos del cliente cuando se inserta un nuevo lead.
 *
 * POST /api/portal/leads/notify
 * Body: { clientId: string, lead: { id, who, sector, service, need, detail, channel } }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId, lead } = body;

    if (!clientId || !lead?.id) {
      return NextResponse.json(
        { ok: false, error: "Parámetros requeridos: clientId y lead (con id)" },
        { status: 400 }
      );
    }

    const result = await sendLeadPushNotification(clientId, lead);

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
      message: `Enviado a ${result.sent} dispositivo(s).`,
    });
  } catch (err: any) {
    console.error("[api/leads/notify] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Error procesando notificación" },
      { status: 500 }
    );
  }
}
