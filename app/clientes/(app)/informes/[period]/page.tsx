import Link from "next/link";
import { notFound } from "next/navigation";
import { getMetrics, getReport, requireMember } from "@/lib/portal/data";
import { byChannel, cap, channelName, daily, delta, fmt, inRange, monthBounds, monthOffset, totals } from "@/lib/portal/metrics";
import { LeadsChart } from "@/components/portal/LeadsChart";
import { Card, Lines, ScoreBars, StatTile } from "@/components/portal/ui";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/portal/PrintButton";

export async function generateMetadata({ params }: { params: Promise<{ period: string }> }) {
  const { period } = await params;
  return { title: `Informe ${period}` };
}

export default async function InformePage({ params }: { params: Promise<{ period: string }> }) {
  const { period: raw } = await params;
  if (!/^\d{4}-\d{2}$/.test(raw)) notFound();
  const period = `${raw}-01`;
  const me = await requireMember();
  const report = await getReport(me.client.id, period);
  if (!report) notFound();

  const prevPeriod = monthOffset(period, -1);
  const b = monthBounds(period);
  const pb = monthBounds(prevPeriod);
  const rows = await getMetrics(me.client.id, pb.from, b.to);
  const cur = totals(inRange(rows, b.from, b.to));
  const prev = totals(inRange(rows, pb.from, pb.to));
  const days = daily(inRange(rows, b.from, b.to), b.from, b.days).map((d) => ({
    label: String(Number(d.start.slice(8))),
    sub: cap(fmt.day(d.start)),
    hot: d.hot,
    rest: d.rest,
    spend: d.spend,
  }));
  const channels = byChannel(inRange(rows, b.from, b.to));
  const vs = fmt.monthShort(prevPeriod);

  return (
    <article className="pc-report">
      <div className="pc-report-bar no-print">
        <Link href="/clientes/informes" className="pc-link">
          ← Informes
        </Link>
        <div className="pc-page-actions">
          {report.pdf_url.startsWith("https://") && (
            <a href={report.pdf_url} className="pc-link" target="_blank" rel="noopener noreferrer">
              Descargar PDF
            </a>
          )}
          <PrintButton />
        </div>
      </div>

      <header className="pc-report-cover">
        <div className="pc-report-top">
          <Logo size={14} />
          <span className="pc-muted">{me.client.name}</span>
        </div>
        <p className="eyebrow">Informe mensual</p>
        <h1 className="display pc-h1">{cap(fmt.month(period))}</h1>
        {report.title && <p className="pc-report-title">{report.title}</p>}
      </header>

      <div className="pc-stats">
        <StatTile label="Leads recibidos" value={fmt.int(cur.leads)} delta={delta(cur.leads, prev.leads)} vs={vs} />
        <StatTile label="Leads nota 4–5" value={fmt.int(cur.hot)} delta={delta(cur.hot, prev.hot)} vs={vs} />
        <StatTile label="CPL calificado" value={fmt.eur(cur.cplHot)} delta={delta(cur.cplHot, prev.cplHot)} goodWhenUp={false} vs={vs} hot />
        <StatTile label="Inversión" value={fmt.eur0(cur.spend)} delta={delta(cur.spend, prev.spend)} neutral vs={vs} />
        <StatTile label="Clientes cerrados" value={fmt.int(cur.closed)} delta={delta(cur.closed, prev.closed)} vs={vs} />
      </div>

      {report.summary && (
        <Card title="Resumen">
          <div className="pc-prose">
            <Lines text={report.summary} />
          </div>
        </Card>
      )}

      <Card>
        <LeadsChart points={days} title="Leads por día" caption={`${cap(fmt.month(period))}. Pasa el ratón por un día para ver el detalle.`} />
      </Card>

      <div className="pc-grid-2">
        <Card title="Leads por nota">
          <ScoreBars byScore={cur.byScore} />
        </Card>
        <Card title="Por canal">
          <div className="pc-table-wrap">
            <table className="pc-table tabular">
              <thead>
                <tr>
                  <th scope="col">Canal</th>
                  <th scope="col">Leads</th>
                  <th scope="col">4–5</th>
                  <th scope="col">Inversión</th>
                  <th scope="col">CPL</th>
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
                    <td>{fmt.eur(c.cpl)}</td>
                    <td>{fmt.eur(c.cplHot)}</td>
                  </tr>
                ))}
                <tr className="pc-total">
                  <th scope="row">Total</th>
                  <td>{fmt.int(cur.leads)}</td>
                  <td>{fmt.int(cur.hot)}</td>
                  <td>{fmt.eur0(cur.spend)}</td>
                  <td>{fmt.eur(cur.cpl)}</td>
                  <td>{fmt.eur(cur.cplHot)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {cur.revenue > 0 && (
            <p className="pc-muted pc-foot-note tabular">
              Facturación de clientes cerrados: <b>{fmt.eur0(cur.revenue)}</b> · retorno sobre inversión{" "}
              <b>{cur.spend ? (cur.revenue / cur.spend).toFixed(1).replace(".", ",") : "—"}×</b>
            </p>
          )}
        </Card>
      </div>

      <div className="pc-grid-2">
        {report.highlights && (
          <Card title="Lo que ha pasado">
            <Lines text={report.highlights} as="ul" />
          </Card>
        )}
        {report.next_steps && (
          <Card title="Próximos pasos">
            <Lines text={report.next_steps} as="ul" />
          </Card>
        )}
      </div>

      <p className="pc-report-foot no-print">
        ¿Dudas sobre este informe? <Link href="/clientes/llamadas">Pide una llamada</Link> o{" "}
        <Link href="/clientes/incidencias/nueva">abre una incidencia</Link>.
      </p>
    </article>
  );
}
