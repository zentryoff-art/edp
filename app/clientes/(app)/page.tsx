import { getBookings, getIncidents, getLeads, getMetrics, getReports, requireMember } from "@/lib/portal/data";
import { isoDay } from "@/lib/portal/metrics";
import { DashboardView } from "@/components/portal/DashboardView";

export const metadata = { title: "Resumen" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ bienvenida?: string }> }) {
  const me = await requireMember();
  const sp = await searchParams;
  const today = new Date();
  const day = (n: number) => isoDay(new Date(today.getTime() - n * 86400000));

  const [rows, leads, reports, bookings, incidents] = await Promise.all([
    getMetrics(me.client.id, day(7 * 12 + 7)),
    getLeads(me.client.id),
    getReports(me.client.id),
    getBookings(me.client.id),
    getIncidents(me.client.id),
  ]);

  return (
    <DashboardView
      initialRows={rows}
      initialLeads={leads}
      bookings={bookings}
      incidents={incidents}
      reports={reports}
      client={me.client}
      fullName={me.fullName}
      bienvenida={sp.bienvenida === "1"}
    />
  );
}
