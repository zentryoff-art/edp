"use client";

import { useEffect, useState } from "react";
import {
  savePushSubscriptionAction,
  removePushSubscriptionAction,
  sendTestPushAction,
} from "@/app/clientes/actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationPrompt({ className = "" }: { className?: string }) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isSupp = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(isSupp);

    if (isSupp) {
      setPermission(Notification.permission);
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(Boolean(sub));
        });
      });
    }
  }, []);

  const handleSubscribe = async () => {
    if (!supported) return;
    setLoading(true);
    setFeedback(null);

    try {
      // 1. Pedir permiso al navegador / sistema
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setFeedback(
          perm === "denied"
            ? "Permiso denegado. Para recibir avisos, actívalo en los ajustes de tu navegador o móvil."
            : "Permiso no concedido."
        );
        setLoading(false);
        return;
      }

      // 2. Esperar al Service Worker
      const reg = await navigator.serviceWorker.ready;

      // 3. Clave pública VAPID
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        throw new Error("Clave pública VAPID no encontrada");
      }

      // 4. Suscribir en el PushManager del dispositivo
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      // 5. Guardar suscripción en Firestore vía Server Action
      const subJson = sub.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        throw new Error("Suscripción Push incompleta");
      }

      const res = await savePushSubscriptionAction({
        subscription: {
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
          },
        },
        userAgent: navigator.userAgent,
      });

      if (!res.ok) {
        throw new Error(res.error || "Error al sincronizar dispositivo");
      }

      setIsSubscribed(true);
      setFeedback("✅ Avisos activados. Enviando notificación de confirmación...");

      // 6. Enviar notificación de prueba de bienvenida al móvil
      await sendTestPushAction({ endpoint: subJson.endpoint });
      setFeedback("✅ ¡Listo! Notificación de confirmación enviada a tu dispositivo.");
    } catch (err: any) {
      console.error("[push] Error al activar notificaciones:", err);
      setFeedback(`Error: ${err.message || "No se pudo activar la notificación"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscriptionAction({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      setFeedback("Avisos desactivados en este dispositivo.");
    } catch (err: any) {
      console.error("[push] Error al desactivar:", err);
      setFeedback("Error al desactivar");
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    setFeedback("Enviando aviso de prueba...");
    try {
      const res = await sendTestPushAction();
      setFeedback(res.message);
    } catch (err: any) {
      setFeedback("Error al enviar prueba");
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return null;
  }

  return (
    <div className={`pwa-push-box ${className}`}>
      <div className="pwa-push-content">
        <div className="pwa-push-icon" aria-hidden="true">
          🔔
        </div>
        <div className="pwa-push-info">
          <p className="pwa-push-title">Avisos de nuevos leads</p>
          <p className="pwa-push-desc">
            {isSubscribed
              ? "Este dispositivo recibirá una alerta sonora en cuanto entre un contacto nuevo."
              : "Recibe un aviso inmediato en tu teléfono cuando entre un nuevo cliente potencial."}
          </p>
        </div>
      </div>

      <div className="pwa-push-actions">
        {isSubscribed ? (
          <>
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={loading}
              className="pwa-push-btn pwa-push-btn-secondary"
            >
              Probar aviso
            </button>
            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={loading}
              className="pwa-push-btn pwa-push-btn-ghost"
              title="Desactivar en este dispositivo"
            >
              Desactivar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={loading}
            className="pwa-push-btn pwa-push-btn-primary"
          >
            {loading ? "Activando..." : "Activar en este móvil"}
          </button>
        )}
      </div>

      {feedback && (
        <p className="pwa-push-feedback" role="status">
          {feedback}
        </p>
      )}
    </div>
  );
}
