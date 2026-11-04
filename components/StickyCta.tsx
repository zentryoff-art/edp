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
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const targetEl = document.getElementById(target);
    const heroEl = document.querySelector(".lp-hero");
    let targetVisible = false;
    let heroVisible = true;

    const update = () => setHidden(targetVisible || heroVisible);

    const ioTarget = new IntersectionObserver(
      ([e]) => {
        targetVisible = e.isIntersecting;
        update();
      },
      { rootMargin: "0px 0px -20% 0px" }
    );
    const ioHero = new IntersectionObserver(
      ([e]) => {
        heroVisible = e.isIntersecting;
        update();
      },
      { threshold: 0.15 }
    );

    if (targetEl) ioTarget.observe(targetEl);
    if (heroEl) {
      ioHero.observe(heroEl);
    } else {
      heroVisible = false;
      update();
    }

    return () => {
      ioTarget.disconnect();
      ioHero.disconnect();
    };
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
