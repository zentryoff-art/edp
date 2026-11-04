"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/tracking-client";

export function LlamadaPageViewTracker() {
  useEffect(() => {
    trackEvent("ViewContent", {
      content_name: "Landing Llamada Diagnóstico",
      content_category: "Captación B2B",
    });
  }, []);

  return null;
}

