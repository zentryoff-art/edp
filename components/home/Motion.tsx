"use client";

import { useEffect } from "react";

/**
 * Efectos globales de la home, sin librerías y solo con transform/opacity:
 * - [data-spot]     → luz que sigue al cursor (--mx / --my)
 * - [data-magnetic] → el elemento se acerca al cursor
 * - [data-tilt]     → inclinación 3D suave
 * - [data-parallax] → desplazamiento vertical ligado al scroll (valor = factor)
 * - barra de progreso de lectura (.mx-progress)
 */
export function Motion() {
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const cleanups: (() => void)[] = [];

    // Spotlight (también en táctil: queda centrado)
    document.querySelectorAll<HTMLElement>("[data-spot]").forEach((el) => {
      let rect: DOMRect | null = null;
      let raf: number | null = null;
      const enter = () => { rect = el.getBoundingClientRect(); };
      const move = (e: PointerEvent) => {
        if (!rect) rect = el.getBoundingClientRect();
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          if (!rect) return;
          el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
          el.style.setProperty("--my", `${e.clientY - rect.top}px`);
        });
      };
      const leave = () => {
        rect = null;
        if (raf) cancelAnimationFrame(raf);
      };
      el.addEventListener("pointerenter", enter);
      el.addEventListener("pointermove", move, { passive: true });
      el.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        el.removeEventListener("pointerenter", enter);
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
        if (raf) cancelAnimationFrame(raf);
      });
    });

    if (fine) {
      document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
        const strength = Number(el.dataset.magnetic) || 0.25;
        let rect: DOMRect | null = null;
        let raf: number | null = null;
        const enter = () => { rect = el.getBoundingClientRect(); };
        const move = (e: PointerEvent) => {
          if (!rect) rect = el.getBoundingClientRect();
          if (raf) cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            if (!rect) return;
            const x = (e.clientX - (rect.left + rect.width / 2)) * strength;
            const y = (e.clientY - (rect.top + rect.height / 2)) * strength;
            el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
          });
        };
        const leave = () => {
          rect = null;
          if (raf) cancelAnimationFrame(raf);
          el.style.transform = "";
        };
        el.addEventListener("pointerenter", enter);
        el.addEventListener("pointermove", move, { passive: true });
        el.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          el.removeEventListener("pointerenter", enter);
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
          if (raf) cancelAnimationFrame(raf);
        });
      });

      document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((el) => {
        const max = Number(el.dataset.tilt) || 6;
        let rect: DOMRect | null = null;
        let raf: number | null = null;
        const enter = () => { rect = el.getBoundingClientRect(); };
        const move = (e: PointerEvent) => {
          if (!rect) rect = el.getBoundingClientRect();
          if (raf) cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            if (!rect) return;
            const px = (e.clientX - rect.left) / rect.width - 0.5;
            const py = (e.clientY - rect.top) / rect.height - 0.5;
            el.style.transform = `perspective(1200px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
          });
        };
        const leave = () => {
          rect = null;
          if (raf) cancelAnimationFrame(raf);
          el.style.transform = "";
        };
        el.addEventListener("pointerenter", enter);
        el.addEventListener("pointermove", move, { passive: true });
        el.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          el.removeEventListener("pointerenter", enter);
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
          if (raf) cancelAnimationFrame(raf);
        });
      });
    }

    // Scroll: parallax + progreso, en un único rAF
    const parallax = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    const bar = document.querySelector<HTMLElement>(".mx-progress");
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const vh = window.innerHeight;
        for (const el of parallax) {
          const r = el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) continue;
          const center = r.top + r.height / 2 - vh / 2;
          el.style.transform = `translate3d(0, ${(center * -Number(el.dataset.parallax || 0.1)).toFixed(1)}px, 0)`;
        }
        if (bar) {
          const max = document.documentElement.scrollHeight - vh;
          bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    cleanups.push(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    });

    return () => cleanups.forEach((c) => c());
  }, []);

  return <div className="mx-progress" aria-hidden />;
}
