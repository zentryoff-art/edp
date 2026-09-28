"use client";

import { useEffect, useState } from "react";
import { Logo } from "./Logo";

const NAV = [
  { href: "#que-hacemos", label: "Qué hacemos" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#prueba-oferta", label: "Prueba gratis" },
  { href: "#preguntas", label: "Preguntas" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""} ${open ? "is-open" : ""}`}>
      <div className="wrap header-row">
        <a href="#top" className="header-logo" aria-label="Estudio Digital Pro, inicio" onClick={() => setOpen(false)}>
          <Logo size={16} />
        </a>

        <nav className="header-nav" aria-label="Principal">
          {NAV.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
          <a href="/llamada" className="header-login">
            Reservar llamada
          </a>
          <a href="/clientes" className="header-login">
            Área de clientes
          </a>
          <a href="#prueba" className="btn btn-ink header-cta">
            Mes de prueba gratis
          </a>
        </nav>

        <button
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

      <div id="mobile-menu" className="mobile-menu" hidden={!open}>
        <nav className="wrap" aria-label="Móvil">
          {NAV.map((n, i) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)}>
              <span className="mono muted tabular">0{i + 1}</span>
              {n.label}
            </a>
          ))}
          <a href="/clientes" onClick={() => setOpen(false)}>
            <span className="mono muted tabular">→</span>
            Área de clientes
          </a>
          <a href="#prueba" className="btn btn-accent" onClick={() => setOpen(false)}>
            Solicita tu mes de prueba gratis <span className="arrow">→</span>
          </a>
          <a href="/llamada" className="btn btn-ink" onClick={() => setOpen(false)}>
            Reservar 20 minutos
          </a>
        </nav>
      </div>
    </header>
  );
}
