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

    const { getDb } = await import("@/lib/firebase/admin");
    const { normalizeLeadDoc } = await import("@/lib/portal/qualification");
    const { syncLeadToMonthlySheet } = await import("@/lib/portal/google-sheets");

    const db = getDb();
    const colName =
      lead.channel === "meta_ads"
        ? "leads_meta"
        : lead.channel === "web"
        ? "leads_web"
        : "leads_lsa";

    const leadDocRef = db.collection("clients").doc(clientId).collection(colName).doc(lead.id);
    const leadSnap = await leadDocRef.get();

    // Si es un lead de la web y no existe en Firestore, persistirlo inmediatamente
    if (!leadSnap.exists && lead.channel === "web") {
      const now = new Date().toISOString();
      let extractedName = "";
      if (lead.who) {
        extractedName = lead.who
          .replace(/^[^\w\s]*CONTACTO\s+WEB:\s*/i, "")
          .replace(/\s*\(\+?[0-9\s-]+\)\s*$/, "")
          .trim();
      }

      const webLeadDoc = {
        id: lead.id,
        lead_id: lead.id,
        client_id: clientId,
        channel: "web",
        lead_type: "message",
        phone: lead.phone || "",
        contact_name: extractedName || lead.who || "Contacto Web",
        message: lead.detail || lead.need || lead.service || "",
        service_type: lead.service || "Contacto Web",
        status: "en_conversacion",
        whatsapp_url: lead.whatsapp_url || "",
        qualification: {
          status: "en_conversacion",
          qualified_at: now,
        },
        created_at: now,
        updated_at: now,
      };

      await leadDocRef.set(webLeadDoc);
    }

    // Enriquecer datos con Firestore si ya existía (ej. location insertada por Hermes)
    const existingLeadData = leadSnap.exists ? leadSnap.data() : null;
    const enrichedLead = {
      ...lead,
      location: lead.location || existingLeadData?.location || null,
    };

    // Enviar notificación Push al dispositivo
    const result = await sendLeadPushNotification(clientId, enrichedLead);

    // Sincronización automática del nuevo lead con el Google Sheet mensual
    try {
      const updatedSnap = await leadDocRef.get();
      const fullLead = updatedSnap.exists
        ? normalizeLeadDoc(lead.id, { channel: lead.channel, ...updatedSnap.data() })
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
