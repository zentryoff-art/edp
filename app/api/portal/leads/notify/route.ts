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

    // Sincronización automática del nuevo lead con el Google Sheet mensual
    try {
      const { getDb } = await import("@/lib/firebase/admin");
      const { normalizeLeadDoc } = await import("@/lib/portal/qualification");
      const { syncLeadToMonthlySheet } = await import("@/lib/portal/google-sheets");

      const db = getDb();
      const colName = lead.channel === "meta_ads" ? "leads_meta" : "leads_lsa";
      const leadSnap = await db.collection("clients").doc(clientId).collection(colName).doc(lead.id).get();
      
      const fullLead = leadSnap.exists
        ? normalizeLeadDoc(lead.id, { channel: lead.channel, ...leadSnap.data() })
        : normalizeLeadDoc(lead.id, lead);

      const clientSnap = await db.collection("clients").doc(clientId).get();
      const clientName = clientSnap.exists ? (clientSnap.data()?.name || clientId) : clientId;

      await syncLeadToMonthlySheet(clientId, clientName, fullLead);
    } catch (sheetErr: any) {
      console.warn("[api/leads/notify] Notice: Could not sync new lead to Google Sheet:", sheetErr.message);
    }

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
