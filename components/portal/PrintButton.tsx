"use client";

import { useEffect, useState } from "react";

export function PrintButton() {
  const [isAutoPrinting, setIsAutoPrinting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("print") === "1" || params.get("print") === "true") {
        setIsAutoPrinting(true);
        const timer = setTimeout(() => {
          window.print();
          setIsAutoPrinting(false);
        }, 700);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  return (
    <button
      type="button"
      className="btn btn-ink"
      onClick={() => window.print()}
      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
    >
      <span>📥</span>
      <span>{isAutoPrinting ? "Preparando PDF..." : "Guardar / Imprimir PDF"}</span>
    </button>
  );
}
