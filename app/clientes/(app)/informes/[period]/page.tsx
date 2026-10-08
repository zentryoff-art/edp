import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeads, getMetrics, getReport, requireMember } from "@/lib/portal/data";
import { byChannel, cap, channelName, daily, delta, fmt, inRange, monthBounds, monthOffset, totals } from "@/lib/portal/metrics";
import { LeadsChart } from "@/components/portal/LeadsChart";
import { Card, Lines, ScoreBars, StatTile, LocationRankingBars, RatioBar } from "@/components/portal/ui";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/portal/PrintButton";
import type { Report } from "@/lib/portal/types";

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

  // Síntesis de informe dinámico si aún no hay documento manual en Firestore
  const fallbackReport: Report = {
    id: `auto_${raw}`,
    period,
    title: `Rendimiento de ${cap(fmt.month(period))}`,
    summary: `Informe mensual consolidado a partir de los datos en tiempo real de Google Ads y Meta Ads.`,
    highlights: `Seguimiento de inversión, leads calificados y costes por lead en tiempo real.`,
    next_steps: `Revisión de pujas, optimización de presupuesto y seguimiento de tasa de cierre comercial.`,
    pdf_url: "",
  };
  const activeReport = report || fallbackReport;

  // Regla del día 5 del siguiente mes para consolidación del PDF
  const [year, month] = raw.split("-").map(Number);
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const closingDate = new Date(Date.UTC(nextMonthYear, nextMonth - 1, 5, 23, 59, 59));
  const now = new Date();
  const isClosed = now.getTime() >= closingDate.getTime();
  const nextMonthName = cap(fmt.month(`${nextMonthYear}-${String(nextMonth).padStart(2, "0")}-01`));

  const prevPeriod = monthOffset(period, -1);
  const b = monthBounds(period);
  const pb = monthBounds(prevPeriod);
  
  const [rows, allLeads] = await Promise.all([
    getMetrics(me.client.id, pb.from, b.to),
    getLeads(me.client.id, b.from),
  ]);

  // Leads de este mes
  const monthLeads = allLeads.filter((l) => {
    const d = (l.created_at || "").slice(0, 10);
    return d >= b.from && d <= b.to;
  });

  const monthHotLeads = monthLeads.filter(
    (l) => (l.score && l.score >= 4) || (l.computed_signals?.internal_rating && l.computed_signals.internal_rating >= 4)
  );

  const monthClosedLeads = monthLeads.filter(
    (l) => l.status === "cerrado" || l.google_lead_status === "BOOKED" || l.qualification?.status === "venta"
  );

  const monthRealRevenue = monthClosedLeads.reduce((acc, l) => {
    const isEst = l.computed_signals?.meta_value_source === "range_estimate";
    return acc + (!isEst ? (l.qualification?.sale_amount || l.sale_amount || 0) : 0);
  }, 0);

  const monthEstRevenue = monthClosedLeads.reduce((acc, l) => {
    const isEst = l.computed_signals?.meta_value_source === "range_estimate";
    return acc + (isEst ? (l.computed_signals?.meta_value || 0) : 0);
  }, 0);
  const monthTotalRevenue = monthRealRevenue + monthEstRevenue;

  const cur = totals(inRange(rows, b.from, b.to), monthLeads.length || undefined);
  const prev = totals(inRange(rows, pb.from, pb.to));

  const days = daily(inRange(rows, b.from, b.to), b.from, b.days).map((d) => {
    const dayLeads = monthLeads.filter((l) => (l.created_at || "").slice(0, 10) === d.start);
    const dayHot = dayLeads.filter(
      (l) => (l.score && l.score >= 4) || (l.computed_signals?.internal_rating && l.computed_signals.internal_rating >= 4)
    ).length;
    const dayRest = dayLeads.length - dayHot;

    return {
      label: String(Number(d.start.slice(8))),
      sub: cap(fmt.day(d.start)),
      hot: dayHot || d.hot,
      rest: dayRest > 0 ? dayRest : d.rest,
      spend: d.spend,
    };
  });

  const channels = byChannel(inRange(rows, b.from, b.to));
  const vs = fmt.monthShort(prevPeriod);

  // Operativa de llamadas vs mensajes
  const callCount = monthLeads.filter(
    (l) => l.lead_type === "phone_call" || (l.channel === "google_lsa" && !l.message)
  ).length;
  const msgCount = monthLeads.filter(
    (l) => l.lead_type === "message" || Boolean(l.message) || l.channel === "meta_ads"
  ).length;

  // Ranking de ubicaciones
  const locMap = new Map<string, number>();
  for (const l of monthLeads) {
    const loc = l.location?.display_name;
    if (loc && loc.trim()) {
      locMap.set(loc.trim(), (locMap.get(loc.trim()) || 0) + 1);
    }
  }
  const topLocations = [...locMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <article className="pc-report">
      <div className="pc-report-bar no-print">
        <Link href="/clientes/informes" className="pc-link">
          ← Informes
        </Link>
        <div className="pc-page-actions">
          {activeReport.pdf_url?.startsWith("https://") && isClosed && (
            <a href={activeReport.pdf_url} className="pc-link" target="_blank" rel="noopener noreferrer">
              Descargar PDF
            </a>
          )}
          {isClosed && <PrintButton />}
        </div>
      </div>

      <header className="pc-report-cover">
        <div className="pc-report-top">
          <Logo size={14} />
          <span className="pc-muted">{me.client.name}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10 }}>
          <div>
            <p className="eyebrow">Informe mensual</p>
            <h1 className="display pc-h1" style={{ margin: 0 }}>{cap(fmt.month(period))}</h1>
          </div>
          <div>
            {isClosed ? (
              <span style={{ background: "#dcfce7", color: "#15803d", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                ✅ Mes Consolidado
              </span>
            ) : (
              <span style={{ background: "#fef3c7", color: "#b45309", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                ⏳ En curso · Cierre previsto 5 de {nextMonthName}
              </span>
            )}
          </div>
        </div>
        {activeReport.title && <p className="pc-report-title">{activeReport.title}</p>}
      </header>

      {/* Banner de consolidación de PDF según la regla del día 5 */}
      {!isClosed && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            fontSize: 13,
            color: "#92400e",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
          className="no-print"
        >
          <span>⏳</span>
          <div>
            <strong>Descarga de PDF ejecutiva:</strong> Este informe mensual está en período de actividad. La versión final en PDF estará disponible para descarga a partir del{" "}
            <strong>5 de {nextMonthName}</strong>, tras la conciliación final de facturación, cierres de ventas e incidencias.
          </div>
        </div>
      )}

      <div className="pc-stats">
        <StatTile label="Leads recibidos" value={fmt.int(monthLeads.length || cur.leads)} delta={delta(monthLeads.length || cur.leads, prev.leads)} vs={vs} />
        <StatTile label="Leads nota 4–5" value={fmt.int(monthHotLeads.length || cur.hot)} delta={delta(monthHotLeads.length || cur.hot, prev.hot)} vs={vs} />
        <StatTile
          label="CPL calificado"
          value={fmt.eur(monthHotLeads.length > 0 ? cur.spend / monthHotLeads.length : cur.cplHot)}
          delta={delta(cur.cplHot, prev.cplHot)}
          goodWhenUp={false}
          vs={vs}
          hot
        />
        <StatTile label="Inversión" value={fmt.eur0(cur.spend)} delta={delta(cur.spend, prev.spend)} neutral vs={vs} />
        <StatTile label="Clientes cerrados" value={fmt.int(monthClosedLeads.length || cur.closed)} delta={delta(monthClosedLeads.length || cur.closed, prev.closed)} vs={vs} />
      </div>

      {activeReport.summary && (
        <Card title="Resumen Ejecutivo">
          <div className="pc-prose">
            <Lines text={activeReport.summary} />
          </div>
        </Card>
      )}

      <Card>
        <LeadsChart points={days} title="Leads por día" caption={`${cap(fmt.month(period))}. Pasa el ratón por un día para ver el detalle.`} />
      </Card>

      <div className="pc-grid-2">
        <Card title="Operativa del Mes">
          <div style={{ padding: "6px 0" }}>
            <RatioBar
              leftLabel="📞 Llamadas"
              leftCount={callCount}
              rightLabel="💬 Mensajes"
              rightCount={msgCount}
              accent="blue"
            />
            <div style={{ marginTop: 14 }}>
              <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                Impresiones Totales Google Ads
              </span>
              <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>
                {fmt.int(cur.impressions)}
              </p>
            </div>
          </div>
        </Card>

        <Card title="Ranking de Ubicaciones">
          <LocationRankingBars items={topLocations} />
        </Card>
      </div>

      <div className="pc-grid-2">
        <Card title="Leads por nota">
          <ScoreBars byScore={cur.byScore} />
        </Card>
        <Card title="Rendimiento por canal">
          <div className="pc-table-wrap">
            <table className="pc-table tabular">
              <thead>
                <tr>
                  <th scope="col">Canal</th>
                  <th scope="col">Leads</th>
                  <th scope="col">Inversión</th>
                  <th scope="col">CPL</th>
                  <th scope="col">Cerrados</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((c) => (
                  <tr key={c.channel}>
                    <th scope="row">{channelName(c.channel)}</th>
                    <td>{fmt.int(c.leads)}</td>
                    <td>{fmt.eur0(c.spend)}</td>
                    <td>{fmt.eur(c.cpl)}</td>
                    <td>{fmt.int(c.closed)}</td>
                  </tr>
                ))}
                <tr className="pc-total">
                  <th scope="row">Total</th>
                  <td>{fmt.int(monthLeads.length || cur.leads)}</td>
                  <td>{fmt.eur0(cur.spend)}</td>
                  <td>{fmt.eur(cur.cpl)}</td>
                  <td>{fmt.int(monthClosedLeads.length || cur.closed)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {(monthTotalRevenue > 0 || cur.revenue > 0) && (
            <p className="pc-muted pc-foot-note tabular">
              Facturación de clientes cerrados: <b>{fmt.eur0(monthTotalRevenue || cur.revenue)}</b> · retorno sobre inversión{" "}
              <b>{cur.spend ? ((monthTotalRevenue || cur.revenue) / cur.spend).toFixed(1).replace(".", ",") : "—"}×</b>
            </p>
          )}
        </Card>
      </div>

      <div className="pc-grid-2">
        {activeReport.highlights && (
          <Card title="Lo que ha pasado">
            <Lines text={activeReport.highlights} as="ul" />
          </Card>
        )}
        {activeReport.next_steps && (
          <Card title="Próximos pasos">
            <Lines text={activeReport.next_steps} as="ul" />
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
