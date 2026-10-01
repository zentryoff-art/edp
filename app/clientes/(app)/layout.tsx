import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PortalNav } from "@/components/portal/PortalNav";
import { ClientSwitcher } from "@/components/portal/ClientSwitcher";
import { getIncidents, requireMember } from "@/lib/portal/data";
import { CONTACT } from "@/lib/contact";
import { signOut } from "../actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMember();
  const availableClients = me.availableClients || [me.client];
  const open = (await getIncidents(me.client.id)).filter((i) => i.status !== "resuelta").length;
  const initials = (me.fullName || me.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  return (
    <div className="pc">
      <aside className="pc-side">
        <Link href="/clientes" className="pc-brand" aria-label="Resumen">
          <Logo size={15} />
        </Link>
        <div className="pc-client">
          <span className="pc-muted">Cliente</span>
          <ClientSwitcher currentClient={me.client} availableClients={availableClients} />
        </div>
        <PortalNav openIncidents={open} />
        <div className="pc-side-foot">
          <a href={`tel:${CONTACT.phone}`}>{CONTACT.phoneDisplay}</a>
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        </div>
      </aside>

      <div className="pc-body">
        <header className="pc-top">
          <span className="pc-top-client">
            <ClientSwitcher currentClient={me.client} availableClients={availableClients} />
          </span>
          <div className="pc-user">
            <span className="pc-avatar" aria-hidden>
              {initials}
            </span>
            <span className="pc-user-name">
              <strong>{me.fullName || me.email}</strong>
              <span className="pc-muted">{me.email}</span>
            </span>
            <form action={signOut}>
              <button type="submit" className="pc-link">
                Salir
              </button>
            </form>
          </div>
        </header>
        <main className="pc-main">{children}</main>
      </div>
    </div>
  );
}
