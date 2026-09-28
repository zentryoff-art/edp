import Link from "next/link";
import { getMetrics, getReports, requireMember } from "@/lib/portal/data";
import { cap, fmt, inRange, monthBounds, totals } from "@/lib/portal/metrics";
import { Empty, PageHead } from "@/components/portal/ui";
import { Scale } from "@/components/Scale";

export const metadata = { title: "Informes" };

export default async function InformesPage() {
  const me = await requireMember();
  const reports = await getReports(me.client.id);
  const oldest = reports.at(-1)?.period;
  const rows = oldest ? await getMetrics(me.client.id, oldest) : [];

  return (
    <>
      <PageHead eyebrow="Informes mensuales" title="Informes" />
      {reports.length === 0 ? (
        <Empty>Todavía no hay informes publicados. El primero llegará al cerrar tu primer mes completo.</Empty>
      ) : (
        <ul className="pc-reports">
          {reports.map((r) => {
            const b = monthBounds(r.period);
            const t = totals(inRange(rows, b.from, b.to));
            return (
              <li key={r.id}>
                <Link href={`/clientes/informes/${r.period.slice(0, 7)}`} className="pc-report-row">
                  <span className="pc-report-month">
                    <Scale score={5} size={7} gap={2} label="" />
                    <strong>{cap(fmt.month(r.period))}</strong>
                    {r.title && <span className="pc-muted">{r.title}</span>}
                  </span>
                  <span className="pc-report-kpis tabular">
                    <span>
                      <small>Leads</small>
                      {fmt.int(t.leads)}
                    </span>
                    <span>
                      <small>Nota 4–5</small>
                      {fmt.int(t.hot)}
                    </span>
                    <span>
                      <small>CPL calif.</small>
                      {fmt.eur(t.cplHot)}
                    </span>
                  </span>
                  <span className="pc-arrow" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
