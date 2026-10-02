"use client";

import { useEffect, useState } from "react";

export function PwaRegister() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // 1. Registrar Service Worker si el navegador lo soporta
    if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("[PWA] Service Worker registrado con éxito:", reg.scope))
        .catch((err) => console.warn("[PWA] Error registrando Service Worker:", err));
    }

    // 2. Control reactivo de conectividad (En línea / Sin conexión)
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="pwa-offline-pill" role="status" aria-live="polite">
      <span className="dot dot-offline" /> Modo sin conexión
    </div>
  );
}
