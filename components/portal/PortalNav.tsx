"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const ITEMS = [
  { href: "/clientes", label: "Resumen", icon: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" },
  { href: "/clientes/leads", label: "Leads", icon: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4zm0-6a2 2 0 1 0 2 2 2 2 0 0 0-2-2z" },
  { href: "/clientes/informes", label: "Informes", icon: "M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h8M9 9h3" },
  { href: "/clientes/llamadas", label: "Llamadas", icon: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4" },
  { href: "/clientes/incidencias", label: "Incidencias", icon: "M4 4h16v12H8l-4 4zM12 8v3M12 13.5v.5" },
];

export function PortalNav({ openIncidents }: { openIncidents: number }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  return (
    <>
      <button className="pc-menu-btn" aria-expanded={open} aria-controls="pc-nav" onClick={() => setOpen((o) => !o)}>
        <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
        <span aria-hidden />
        <span aria-hidden />
      </button>
      <nav id="pc-nav" className={`pc-nav ${open ? "is-open" : ""}`} aria-label="Área de clientes">
        {ITEMS.map((it) => {
          const active = it.href === "/clientes" ? path === "/clientes" : path.startsWith(it.href);
          return (
            <Link key={it.href} href={it.href} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path d={it.icon} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              {it.label}
              {it.href === "/clientes/incidencias" && openIncidents > 0 && <span className="pc-badge tabular">{openIncidents}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
