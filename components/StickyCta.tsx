"use client";

import { useEffect, useState } from "react";

/** Botón fijo en móvil; se oculta mientras la sección objetivo está en pantalla. */
export function StickyCta({ target, children }: { target: string; children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = document.getElementById(target);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setHidden(e.isIntersecting), { rootMargin: "0px 0px -20% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [target]);

  return (
    <a href={`#${target}`} className={`lp-sticky btn btn-accent ${hidden ? "is-hidden" : ""}`} aria-hidden={hidden} tabIndex={hidden ? -1 : 0}>
      {children}
    </a>
  );
}
