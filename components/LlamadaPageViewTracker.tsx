"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/tracking-client";

export function LlamadaPageViewTracker({ nicheCategory = "general" }: { nicheCategory?: string }) {
  useEffect(() => {
    trackEvent("ViewContent", {
      content_name: "Landing Llamada Diagnóstico",
      content_category: `Captación B2B · ${nicheCategory}`,
    });
  }, [nicheCategory]);

  return null;
}

