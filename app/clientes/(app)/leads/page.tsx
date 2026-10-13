import { getLeads, requireMember } from "@/lib/portal/data";
import { LeadsView } from "@/components/portal/LeadsView";
import { PageHead } from "@/components/portal/ui";
import { PushNotificationPrompt } from "@/components/portal/PushNotificationPrompt";

export const metadata = {
  title: "Leads y Calificación · Área de Clientes",
};

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const me = await requireMember();
  const leads = await getLeads(me.client.id);

  return (
    <>
      <PageHead
        eyebrow="Operativa en tiempo real"
        title="Leads y Calificación"
      >
        <span className="pc-muted text-sm">
          {leads.length} {leads.length === 1 ? "contacto recibido" : "contactos recibidos"}
        </span>
      </PageHead>

      <PushNotificationPrompt />

      <LeadsView key={me.client.id} initialLeads={leads} clientId={me.client.id} client={me.client} />
    </>
  );
}
