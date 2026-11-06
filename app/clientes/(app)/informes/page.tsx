import { getLeads, getMetrics, getReports, requireMember } from "@/lib/portal/data";
import { getAllMonthlySheets } from "@/lib/portal/google-sheets";
import { InformesHubView } from "@/components/portal/InformesHubView";

export const metadata = { title: "Informes y Auditoría" };

export default async function InformesPage() {
  const me = await requireMember();

  const [reports, rows, leads, sheetsMap] = await Promise.all([
    getReports(me.client.id),
    getMetrics(me.client.id, ""),
    getLeads(me.client.id, ""),
    getAllMonthlySheets(me.client.id).catch(() => ({})),
  ]);

  return (
    <InformesHubView
      reports={reports}
      rows={rows}
      leads={leads}
      clientName={me.client.name}
      clientId={me.client.id}
      initialSheetsMap={sheetsMap}
    />
  );
}
