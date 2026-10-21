import "server-only";
import webpush, { type PushSubscription } from "web-push";
import crypto from "crypto";
import { getDb } from "@/lib/firebase/admin";

export type StoredPushSubscription = {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  memberId?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
};

let webPushInitialized = false;

function initWebPush(): boolean {
  if (webPushInitialized) return true;

  const subject = process.env.VAPID_SUBJECT || "mailto:j.roldan@estudiodigitalpro.com";
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    console.warn("[push] Faltan variables NEXT_PUBLIC_VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY");
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    webPushInitialized = true;
    return true;
  } catch (err) {
    console.error("[push] Error inicializando web-push VAPID:", err);
    return false;
  }
}

/**
 * Genera un ID determinista a partir del endpoint para evitar duplicados en Firestore.
 */
function hashEndpoint(endpoint: string): string {
  return crypto.createHash("sha256").update(endpoint).digest("hex").slice(0, 32);
}

/**
 * Guarda o actualiza una suscripción Push para un cliente en Firestore.
 */
export async function savePushSubscription(
  clientId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  memberId?: string,
  userAgent?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!clientId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return { ok: false, error: "Datos de suscripción incompletos" };
  }

  try {
    const db = getDb();
    const subId = hashEndpoint(subscription.endpoint);
    const docRef = db.collection("clients").doc(clientId).collection("push_subscriptions").doc(subId);

    const now = new Date().toISOString();
    await docRef.set(
      {
        id: subId,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        memberId: memberId || "anonymous",
        userAgent: userAgent || "",
        active: true,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );

    return { ok: true };
  } catch (err: any) {
    console.error("[push] Error guardando suscripción:", err);
    return { ok: false, error: err.message || "Error al guardar en base de datos" };
  }
}

/**
 * Elimina una suscripción Push cuando el usuario revoca permisos.
 */
export async function removePushSubscription(clientId: string, endpoint: string): Promise<boolean> {
  if (!clientId || !endpoint) return false;
  try {
    const db = getDb();
    const subId = hashEndpoint(endpoint);
    await db.collection("clients").doc(clientId).collection("push_subscriptions").doc(subId).delete();
    return true;
  } catch (err) {
    console.error("[push] Error eliminando suscripción:", err);
    return false;
  }
}

/**
 * Envía una notificación Web Push a todos los dispositivos registrados del cliente
 * cuando llega un NUEVO LEAD.
 */
export async function sendLeadPushNotification(
  clientId: string,
  lead: {
    id: string;
    who?: string;
    sector?: string;
    service?: string;
    need?: string;
    detail?: string;
    channel?: string;
    phone?: string;
    whatsapp_url?: string;
  }
): Promise<{ sent: number; failed: number }> {
  if (!clientId || !initWebPush()) {
    return { sent: 0, failed: 0 };
  }

  try {
    const db = getDb();
    const snap = await db
      .collection("clients")
      .doc(clientId)
      .collection("push_subscriptions")
      .where("active", "==", true)
      .get();

    if (snap.empty) {
      return { sent: 0, failed: 0 };
    }

    const isWeb = lead.channel === "web";
    const channelName =
      lead.channel === "google_lsa"
        ? "Google LSA"
        : lead.channel === "meta_ads"
        ? "Meta Ads"
        : lead.channel === "google_ads"
        ? "Google Ads"
        : "Web";

    const title = isWeb
      ? "🌐 CONTACTO WEB - Clic para contactar"
      : `🔥 Nuevo lead: ${lead.who || lead.sector || "Contacto recibido"}`;

    const body = isWeb
      ? `${lead.who ? lead.who + " · " : ""}${lead.service || lead.detail || "Nuevo contacto desde la web"}`
      : `${lead.service || lead.need || lead.detail || "Nuevo cliente potencial"} · ${channelName}`;

    const payload = JSON.stringify({
      title,
      body,
      url: `/clientes/leads?leadId=${lead.id}`,
      leadId: lead.id,
      whatsapp_url: lead.whatsapp_url || null,
      tag: `lead-${lead.id}`,
    });

    let sent = 0;
    let failed = 0;

    const promises = snap.docs.map(async (doc) => {
      const data = doc.data();
      const pushSub: PushSubscription = {
        endpoint: data.endpoint,
        keys: {
          p256dh: data.keys?.p256dh,
          auth: data.keys?.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSub, payload);
        sent++;
      } catch (err: any) {
        failed++;
        // 404 o 410 = suscripción expirada o revocada por el navegador
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[push] Suscripción expirada (${err.statusCode}), eliminando doc ${doc.id}`);
          await doc.ref.delete().catch(() => {});
        } else {
          console.warn(`[push] Error enviando a ${doc.id}:`, err.message || err);
        }
      }
    });

    await Promise.all(promises);
    return { sent, failed };
  } catch (err) {
    console.error("[push] Error global enviando notificaciones de lead:", err);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Envía una notificación de prueba al dispositivo para comprobar la recepción.
 */
export async function sendTestPushNotification(
  clientId: string,
  endpoint?: string
): Promise<{ ok: boolean; message: string }> {
  if (!clientId || !initWebPush()) {
    return { ok: false, message: "Web Push no está configurado (faltan claves VAPID)." };
  }

  try {
    const db = getDb();
    let queryRef = db.collection("clients").doc(clientId).collection("push_subscriptions");
    const snap = endpoint
      ? await queryRef.where("endpoint", "==", endpoint).limit(1).get()
      : await queryRef.where("active", "==", true).limit(5).get();

    if (snap.empty) {
      return { ok: false, message: "No se encontraron dispositivos suscritos para este cliente." };
    }

    const payload = JSON.stringify({
      title: "✅ Notificaciones activadas",
      body: "Tu teléfono recibirá un aviso inmediato cada vez que entre un nuevo cliente potencial.",
      url: "/clientes/leads",
      tag: "test-notification-" + Date.now(),
    });

    let sent = 0;
    for (const doc of snap.docs) {
      const data = doc.data();
      const pushSub: PushSubscription = {
        endpoint: data.endpoint,
        keys: {
          p256dh: data.keys?.p256dh,
          auth: data.keys?.auth,
        },
      };
      try {
        await webpush.sendNotification(pushSub, payload);
        sent++;
      } catch (e: any) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await doc.ref.delete().catch(() => {});
        }
      }
    }

    return {
      ok: sent > 0,
      message: sent > 0 ? `Notificación enviada con éxito a ${sent} dispositivo(s).` : "No se pudo entregar la notificación.",
    };
  } catch (err: any) {
    return { ok: false, message: err.message || "Error al enviar notificación de prueba." };
  }
}
