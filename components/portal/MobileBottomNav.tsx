"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/clientes",
    label: "Resumen",
    exact: true,
    iconOutline: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/clientes/leads",
    label: "Leads",
    exact: false,
    iconOutline: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15a5 5 0 100-10 5 5 0 000 10zm0-7a2 2 0 100 4 2 2 0 000-4z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: "/clientes/informes",
    label: "Informes",
    exact: false,
    iconOutline: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 15H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
      </svg>
    ),
  },
  {
    href: "/clientes/llamadas",
    label: "Llamadas",
    exact: false,
    iconOutline: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-2.2 2.2a15.05 15.05 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1A11.36 11.36 0 018.5 3.99c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-.99-1.11z" />
      </svg>
    ),
  },
  {
    href: "/clientes/incidencias",
    label: "Incidencias",
    exact: false,
    iconOutline: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path fillRule="evenodd" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 6h2v6h-2V7zm1 11a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export function MobileBottomNav({ openIncidents = 0 }: { openIncidents?: number }) {
  const pathname = usePathname();

  return (
    <nav className="pwa-bottom-nav" aria-label="Navegación principal móvil">
      <div className="pwa-bottom-nav-inner">
        {TABS.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(tab.href + "/");

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`pwa-tab-btn ${isActive ? "is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="pwa-tab-icon-wrap">
                {isActive ? tab.iconFilled : tab.iconOutline}
                {tab.href === "/clientes/incidencias" && openIncidents > 0 && (
                  <span className="pwa-tab-badge">{openIncidents}</span>
                )}
              </div>
              <span className="pwa-tab-label">{tab.label}</span>
              {isActive && <span className="pwa-tab-active-dot" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
