import Link from "next/link";
import { getBookings, getIncidents, getMetrics, getReports, requireMember } from "@/lib/portal/data";
import { byChannel, cap, channelName, delta, fmt, isoDay, totals, weekly } from "@/lib/portal/metrics";
import { LeadsChart } from "@/components/portal/LeadsChart";
import { Card, Empty, PageHead, ScoreBars, StatTile, StatusChip } from "@/components/portal/ui";

export const metadata = { title: "Resumen" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ bienvenida?: string }> }) {
  const me = await requireMember();
  const sp = await searchParams;
  const today = new Date();
  const day = (n: number) => isoDay(new Date(today.getTime() - n * 86400000));

  const [rows, reports, bookings, incidents] = await Promise.all([
    getMetrics(me.client.id, day(7 * 12 + 7)),
    getReports(me.client.id),
    getBookings(me.client.id),
    getIncidents(me.client.id),
  ]);

  // Últimos 30 días completos frente a los 30 anteriores.
  const cur = totals(rows.filter((r) => r.date >= day(30) && r.date <= day(1)));
  const prev = totals(rows.filter((r) => r.date >= day(60) && r.date <= day(31)));
  const weeks = weekly(rows, 12, new Date(today.getTime() - 86400000)).map((w) => ({
    label: fmt.day(w.start),
    sub: `Semana del ${fmt.day(w.start)} al ${fmt.day(w.end)}`,
    hot: w.hot,
    rest: w.rest,
    spend: w.spend,
  }));
  const channels = byChannel(rows.filter((r) => r.date >= day(30)));
  const nextCall = bookings.filter((b) => b.status === "confirmed" && b.starts_at > today.toISOString()).at(-1);
  const openIncidents = incidents.filter((i) => i.status !== "resuelta");
  const lastReport = reports[0];
  const first = (me.fullName || "").split(" ")[0];

  return (
    <>
      <PageHead eyebrow="Resumen · últimos 30 días" title={first ? `Hola, ${first}.` : "Resumen"}>
        <Link href="/clientes/llamadas" className="btn btn-ink">
          Pedir una llamada
        </Link>
      </PageHead>

      {sp.bienvenida === "1" && (
        <p className="pc-msg is-ok" role="status">
          Contraseña guardada. Ya puedes entrar cuando quieras con tu email.
        </p>
      )}

      {rows.length === 0 ? (
        <Empty>
          Aún no hay datos de campañas. En cuanto subamos las primeras métricas verás aquí tus leads, su nota y lo que te
          cuestan.
        </Empty>
      ) : (
        <>
          <div className="pc-stats">
            <StatTile label="Leads recibidos" value={fmt.int(cur.leads)} delta={delta(cur.leads, prev.leads)} vs="30 días antes" />
            <StatTile
              label="Leads nota 4–5"
              value={`${fmt.int(cur.hot)} · ${cur.leads ? Math.round((cur.hot / cur.leads) * 100) : 0} %`}
              delta={delta(cur.hot, prev.hot)}
              vs="30 días antes"
            />
            <StatTile label="Coste por lead calificado" value={fmt.eur(cur.cplHot)} delta={delta(cur.cplHot, prev.cplHot)} goodWhenUp={false} vs="30 días antes" hot />
            <StatTile label="Inversión" value={fmt.eur0(cur.spend)} delta={delta(cur.spend, prev.spend)} neutral vs="30 días antes" />
            <StatTile label="Clientes cerrados" value={fmt.int(cur.closed)} delta={delta(cur.closed, prev.closed)} vs="30 días antes" />
          </div>

          <Card>
            <LeadsChart points={weeks} title="Leads por semana" caption="Últimas 12 semanas. Pasa el ratón por una semana para ver el detalle." />
          </Card>

          <div className="pc-grid-2">
            <Card title="Leads por nota" action={<span className="pc-muted">30 días</span>}>
              <ScoreBars byScore={cur.byScore} />
            </Card>
            <Card title="Por canal" action={<span className="pc-muted">30 días</span>}>
              <div className="pc-table-wrap">
                <table className="pc-table tabular">
                  <thead>
                    <tr>
                      <th scope="col">Canal</th>
                      <th scope="col">Leads</th>
                      <th scope="col">Nota 4–5</th>
                      <th scope="col">Inversión</th>
                      <th scope="col">CPL calif.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((c) => (
                      <tr key={c.channel}>
                        <th scope="row">{channelName(c.channel)}</th>
                        <td>{fmt.int(c.leads)}</td>
                        <td>{fmt.int(c.hot)}</td>
                        <td>{fmt.eur0(c.spend)}</td>
                        <td>{fmt.eur(c.cplHot)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}

      <div className="pc-grid-3">
        <Card title="Próxima llamada">
          {nextCall ? (
            <div className="pc-next">
              <strong>{cap(fmt.dateTime(nextCall.starts_at))}</strong>
              {nextCall.notes && <p className="pc-muted">{nextCall.notes}</p>}
              <Link href="/clientes/llamadas" className="pc-link">
                Ver llamadas →
              </Link>
            </div>
          ) : (
            <div className="pc-next">
              <p className="pc-muted">No tienes ninguna llamada programada.</p>
              <Link href="/clientes/llamadas" className="pc-link">
                Pedir una llamada →
              </Link>
            </div>
          )}
        </Card>

        <Card title="Incidencias" action={<Link href="/clientes/incidencias/nueva" className="pc-link">Nueva</Link>}>
          {openIncidents.length ? (
            <ul className="pc-mini-list">
              {openIncidents.slice(0, 3).map((i) => (
                <li key={i.id}>
                  <Link href={`/clientes/incidencias/${i.id}`}>{i.title}</Link>
                  <StatusChip status={i.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="pc-muted">Ninguna abierta. Si algo no va bien, cuéntanoslo.</p>
          )}
        </Card>

        <Card title="Último informe">
          {lastReport ? (
            <div className="pc-next">
              <strong>{cap(fmt.month(lastReport.period))}</strong>
              {lastReport.title && <p className="pc-muted">{lastReport.title}</p>}
              <Link href={`/clientes/informes/${lastReport.period.slice(0, 7)}`} className="pc-link">
                Leer informe →
              </Link>
            </div>
          ) : (
            <p className="pc-muted">El primer informe mensual aparecerá aquí.</p>
          )}
        </Card>
      </div>
    </>
  );
}
