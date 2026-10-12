"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";

const NAV = [
  { href: "#que-hacemos", label: "Qué hacemos" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#area", label: "Área de clientes" },
  { href: "#preguntas", label: "Preguntas" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Menú abierto: bloquea el scroll, Escape cierra, foco dentro; al pasar a escritorio se cierra.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("menu-open", open);
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const mq = window.matchMedia("(min-width: 1101px)");
    const onMq = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      root.classList.remove("menu-open");
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [open]);

  const close = () => setOpen(false);

  // Con el scroll bloqueado el navegador ignora el salto al ancla: primero se cierra y luego se desplaza.
  const go = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const href = e.currentTarget.getAttribute("href") || "";
    if (!href.startsWith("#")) return close();
    e.preventDefault();
    document.documentElement.classList.remove("menu-open");
    setOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", href);
  };

  return (
    <>
      <header className={`site-header hx-header ${scrolled ? "is-scrolled" : ""} ${open ? "is-open" : ""}`}>
        <div className="wrap header-row">
          <a href="#top" className="header-logo" aria-label="Estudio Digital Pro, inicio" onClick={go}>
            <Logo size={16} />
          </a>

          <nav className="header-nav" aria-label="Principal">
            {NAV.map((n) => (
              <a key={n.href} href={n.href}>
                {n.label}
              </a>
            ))}
            <a href="/clientes" className="header-login">
              Entrar
            </a>
            <a href="#prueba" className="btn btn-accent header-cta" data-magnetic="0.15">
              Mes de prueba gratis
            </a>
          </nav>

          <button
            ref={btnRef}
            className="menu-btn"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <div
        id="mobile-menu"
        ref={menuRef}
        className={`hx-menu ${open ? "is-open" : ""}`}
        aria-hidden={!open}
        inert={!open}
      >
        <span className="blob blob-menu" aria-hidden />
        <nav className="wrap hx-menu-nav" aria-label="Móvil">
          {NAV.map((n, i) => (
            <a key={n.href} href={n.href} onClick={go} style={{ "--i": i } as React.CSSProperties}>
              <span className="mono tabular">0{i + 1}</span>
              {n.label}
            </a>
          ))}
          <div className="hx-menu-ctas" style={{ "--i": NAV.length } as React.CSSProperties}>
            <a href="#prueba" className="btn btn-accent" onClick={go}>
              Solicita tu mes de prueba gratis <span className="arrow">→</span>
            </a>
            <a href="/llamada" className="btn btn-ghost" onClick={close}>
              Reservar 20 minutos
            </a>
            <a href="/clientes" className="hx-menu-login" onClick={close}>
              Entrar al área de clientes →
            </a>
          </div>
        </nav>
      </div>
    </>
  );
}
