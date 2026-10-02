import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PortalNav } from "@/components/portal/PortalNav";
import { ClientSwitcher } from "@/components/portal/ClientSwitcher";
import { PortalTopBar } from "@/components/portal/PortalTopBar";
import { MobileBottomNav } from "@/components/portal/MobileBottomNav";
import { PwaRegister } from "@/components/portal/PwaRegister";
import { getIncidents, requireMember } from "@/lib/portal/data";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMember();
  const availableClients = me.availableClients || [me.client];
  const open = (await getIncidents(me.client.id)).filter((i) => i.status !== "resuelta").length;

  return (
    <div className="pc">
      <PwaRegister />

      {/* ── Sidebar Desktop / Tablet (Oculto en Móvil) ── */}
      <aside className="pc-side">
        <Link href="/clientes" className="pc-brand" aria-label="Resumen">
          <Logo size={15} />
        </Link>
        <div className="pc-client">
          <span className="pc-muted">Cliente</span>
          <ClientSwitcher currentClient={me.client} availableClients={availableClients} />
        </div>
        <PortalNav openIncidents={open} />
      </aside>

      {/* ── Contenedor Principal con Header Nativo y Safe Areas ── */}
      <div className="pc-body">
        <PortalTopBar
          member={me}
          availableClients={availableClients}
          openIncidents={open}
        />
        <main className="pc-main">{children}</main>
      </div>

      {/* ── Barra Inferior Fija (Exclusiva para Móvil / PWA) ── */}
      <MobileBottomNav openIncidents={open} />
    </div>
  );
}
