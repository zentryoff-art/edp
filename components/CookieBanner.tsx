"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { captureAttribution } from "@/lib/attribution-client";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Inicializar siempre la captura de atribución (URL params, sesión)
    captureAttribution();

    // Comprobar si el usuario ya tomó una decisión sobre cookies
    const stored = localStorage.getItem("edp_cookie_consent");
    if (!stored) {
      setShow(true);
    }
  }, []);

  function handleConsent(type: "all" | "necessary") {
    localStorage.setItem("edp_cookie_consent", type);
    window.dispatchEvent(new Event("edp_consent_updated"));
    setShow(false);
  }

  if (!show) return null;

  return (
    <aside
      aria-label="Consentimiento de cookies"
      style={{
        position: "fixed",
        bottom: "16px",
        left: "16px",
        right: "16px",
        maxWidth: "600px",
        zIndex: 9999,
        background: "#16140F",
        color: "#FAF9F6",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        padding: "20px 24px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
        fontSize: "13px",
        lineHeight: "1.55",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <strong style={{ display: "block", color: "#E75623", fontSize: "14px", marginBottom: "4px", letterSpacing: "0.02em" }}>
            TRANSPARENCIA Y PRIVACIDAD
          </strong>
          <p style={{ margin: 0, color: "rgba(255, 255, 255, 0.85)" }}>
            Utilizamos cookies técnicas imprescindibles para el funcionamiento de la web y, con tu consentimiento,
            cookies analíticas para medir el rendimiento de nuestras campañas. Puedes revisar los detalles en nuestra{" "}
            <Link
              href="/privacidad"
              style={{ color: "#E75623", textDecoration: "underline", textUnderlineOffset: "3px" }}
            >
              Política de Privacidad
            </Link>
            .
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => handleConsent("all")}
            className="btn btn-ink"
            style={{
              background: "#E75623",
              color: "#fff",
              border: "1px solid #E75623",
              padding: "8px 16px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Aceptar todas
          </button>
          <button
            type="button"
            onClick={() => handleConsent("necessary")}
            className="btn btn-outline"
            style={{
              background: "transparent",
              color: "#FAF9F6",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              padding: "8px 16px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Solo necesarias
          </button>
        </div>
      </div>
    </aside>
  );
}
