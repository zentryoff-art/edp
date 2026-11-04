"use client";

import { useEffect, useState } from "react";
import { WhatsAppCta } from "./WhatsAppCta";

/** Barra fija inferior en móvil con llamada a la agenda y acceso rápido a WhatsApp. */
export function StickyCta({
  target,
  children,
  whatsappText,
}: {
  target: string;
  children: React.ReactNode;
  whatsappText?: string;
}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = document.getElementById(target);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setHidden(e.isIntersecting), { rootMargin: "0px 0px -20% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [target]);

  return (
    <div className={`lp-sticky-bar ${hidden ? "is-hidden" : ""}`} aria-hidden={hidden}>
      <a
        href={`#${target}`}
        className="btn btn-accent lp-sticky-btn"
        tabIndex={hidden ? -1 : 0}
      >
        {children}
      </a>
      <WhatsAppCta
        variant="badge"
        className="lp-sticky-wa"
        source="sticky_mobile"
        prefilledText={whatsappText}
      >
        WhatsApp
      </WhatsAppCta>
    </div>
  );
}
