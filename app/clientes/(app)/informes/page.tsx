import { getLeads, getMetrics, getReports, requireMember } from "@/lib/portal/data";
import { InformesHubView } from "@/components/portal/InformesHubView";

export const metadata = { title: "Informes y Auditoría" };

export default async function InformesPage() {
  const me = await requireMember();

  const [reports, rows, leads] = await Promise.all([
    getReports(me.client.id),
    getMetrics(me.client.id, "2026-09-01"),
    getLeads(me.client.id, "2026-09-01"),
  ]);

  return (
    <InformesHubView
      reports={reports}
      rows={rows}
      leads={leads}
      clientName={me.client.name}
    />
  );
}
