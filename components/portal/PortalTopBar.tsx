"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClientSwitcher } from "./ClientSwitcher";
import type { Client, Member } from "@/lib/portal/types";
import { signOut } from "@/app/clientes/actions";

export function PortalTopBar({
  member,
  availableClients,
  openIncidents = 0,
}: {
  member: Member;
  availableClients: Client[];
  openIncidents?: number;
}) {
  const [isOnline, setIsOnline] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const clientInitials = member.client.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "CL";

  const userInitials = (member.fullName || member.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <header className="pwa-header">
      {/* ── Left: Client Business Avatar & Active Account Switcher ── */}
      <div className="pwa-header-client">
        <div className="pwa-client-avatar" title={member.client.name}>
          {clientInitials}
        </div>
        <div className="pwa-client-details">
          <div className="pwa-client-name-row">
            <ClientSwitcher currentClient={member.client} availableClients={availableClients} />
          </div>
          {/* Live connection badge */}
          <div className="pwa-status-row">
            {isOnline ? (
              <span className="pwa-status-pill is-online">
                <span className="status-dot-pulse" />
                <span className="status-text">En línea</span>
              </span>
            ) : (
              <span className="pwa-status-pill is-offline">
                <span className="status-dot-offline" />
                <span className="status-text">Sin conexión</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Notifications / Incidents Bell & User Profile ── */}
      <div className="pwa-header-actions">
        {/* Incident Alert Bell */}
        <Link
          href="/clientes/incidencias"
          className="pwa-action-btn"
          aria-label={openIncidents > 0 ? `${openIncidents} incidencias abiertas` : "Incidencias y alertas"}
          title="Incidencias y soporte"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {openIncidents > 0 && <span className="pwa-badge-alert-dot" />}
        </Link>

        {/* User Avatar & Menu */}
        <div className="pwa-user-wrap">
          <button
            type="button"
            className="pwa-user-avatar-btn"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            aria-label="Menú de usuario"
            aria-expanded={userMenuOpen}
          >
            <span className="pwa-user-avatar">{userInitials}</span>
          </button>

          {userMenuOpen && (
            <>
              <div className="pwa-user-backdrop" onClick={() => setUserMenuOpen(false)} />
              <div className="pwa-user-popover">
                <div className="pwa-user-popover-head">
                  <strong>{member.fullName || member.email}</strong>
                  <span className="pwa-user-email">{member.email}</span>
                  <span className="pwa-user-role">
                    {member.role === "owner" ? "Propietario" : "Miembro"} · {member.client.name}
                  </span>
                </div>
                <div className="pwa-user-popover-foot">
                  <form action={signOut}>
                    <button type="submit" className="pwa-btn-signout">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Cerrar sesión
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
