import Link from "next/link";
import { getBookings, getIncidents, getLeads, getMetrics, getReports, requireMember } from "@/lib/portal/data";
import { cap, channelName, fmt, isoDay, weekly } from "@/lib/portal/metrics";
import { LeadsChart } from "@/components/portal/LeadsChart";
import { Card, Empty, PageHead, StatTile, StatusChip, LocationRankingBars, RatioBar } from "@/components/portal/ui";

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

  // Enfoque en Octubre 2026 (mes en curso limpio y auditado)
  const octStart = "2026-10-01";
  const octLeads = leads.filter((l) => (l.created_at || "").slice(0, 10) >= octStart);
  const octRows = rows.filter((r) => r.date >= octStart);

  // Totales de Octubre
  const octSpend = octRows.reduce((a, r) => a + (r.spend || 0), 0);
  const octLeadsCount = octLeads.length;
  const octCpl = octLeadsCount > 0 ? octSpend / octLeadsCount : null;

  const octClosedLeads = octLeads.filter(
    (l) => l.status === "cerrado" || l.google_lead_status === "BOOKED" || l.qualification?.status === "venta"
  );
  const octClosedCount = octClosedLeads.length;

  const octRealRevenue = octClosedLeads.reduce((acc, l) => {
    const isEstimate = l.computed_signals?.meta_value_source === "range_estimate";
    return acc + (!isEstimate ? (l.qualification?.sale_amount || l.sale_amount || 0) : 0);
  }, 0);

  const octEstimateRevenue = octClosedLeads.reduce((acc, l) => {
    const isEstimate = l.computed_signals?.meta_value_source === "range_estimate";
    return acc + (isEstimate ? (l.computed_signals?.meta_value || 0) : 0);
  }, 0);

  const octTotalRevenue = octRealRevenue + octEstimateRevenue;
  const hasEstimates = octEstimateRevenue > 0;
  const octRoas = octSpend > 0 && octTotalRevenue > 0 ? octTotalRevenue / octSpend : null;

  // Desglose de Operativa (Llamadas vs Mensajes)
  const callCount = octLeads.filter(
    (l) => l.lead_type === "phone_call" || (l.channel === "google_lsa" && !l.message)
  ).length;
  const msgCount = octLeads.filter(
    (l) => l.lead_type === "message" || Boolean(l.message) || l.channel === "meta_ads"
  ).length;

  // Desglose de Facturación (Cobrados vs En revisión Google)
  const chargedCount = octLeads.filter((l) => l.lead_charged === true).length;
  const inReviewCount = octLeads.filter(
    (l) => l.channel === "google_lsa" && l.lead_charged !== true
  ).length;

  // Disputados / Archivados
  const disputedCount = octLeads.filter(
    (l) => l.status === "rechazado" || l.google_lead_status === "DECLINED" || l.qualification?.status === "rechazado"
  ).length;

  // Rendimiento de Anuncios (Google Ads API)
  const totalImpressions = octRows.reduce((a, r) => a + (r.impressions || 0), 0);
  const topImpRows = octRows.filter((r) => r.top_impression_percentage != null);
  const avgTopImp = topImpRows.length > 0
    ? topImpRows.reduce((a, r) => a + r.top_impression_percentage!, 0) / topImpRows.length
    : null;
  const absTopImpRows = octRows.filter((r) => r.absolute_top_impression_percentage != null);
  const avgAbsTopImp = absTopImpRows.length > 0
    ? absTopImpRows.reduce((a, r) => a + r.absolute_top_impression_percentage!, 0) / absTopImpRows.length
    : null;

  // Ranking de Ubicaciones
  const locMap = new Map<string, number>();
  for (const l of octLeads) {
    const loc = l.location?.display_name;
    if (loc && loc.trim()) {
      locMap.set(loc.trim(), (locMap.get(loc.trim()) || 0) + 1);
    }
  }
  const topLocations = [...locMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Gráfica de 12 semanas
  const weeks = weekly(rows, 12, new Date(today.getTime() - 86400000)).map((w) => {
    const weekLeads = leads.filter((l) => {
      const d = (l.created_at || "").slice(0, 10);
      return d >= w.start && d <= w.end;
    });
    const hotLeads = weekLeads.filter(
      (l) => (l.score && l.score >= 4) || (l.computed_signals?.internal_rating && l.computed_signals.internal_rating >= 4)
    );
    const restLeads = weekLeads.length - hotLeads.length;

    return {
      label: fmt.day(w.start),
      sub: `Semana del ${fmt.day(w.start)} al ${fmt.day(w.end)}`,
      hot: hotLeads.length || w.hot,
      rest: restLeads > 0 ? restLeads : w.rest,
      spend: w.spend,
    };
  });

  // Canales en Octubre
  const channelKeys = Array.from(new Set([...octRows.map((r) => r.channel), ...octLeads.map((l) => l.channel)]));
  const channelSummary = channelKeys.map((channel) => {
    const chRows = octRows.filter((r) => r.channel === channel);
    const chLeads = octLeads.filter((l) => l.channel === channel);
    const spend = chRows.reduce((a, r) => a + (r.spend || 0), 0);
    const closed = chLeads.filter(
      (l) => l.status === "cerrado" || l.google_lead_status === "BOOKED" || l.qualification?.status === "venta"
    ).length;
    return {
      channel,
      leads: chLeads.length,
      spend,
      cpl: chLeads.length > 0 ? spend / chLeads.length : null,
      closed,
    };
  }).sort((a, b) => b.leads - a.leads);

  const nextCall = bookings.filter((b) => b.status === "confirmed" && b.starts_at > today.toISOString()).at(-1);
  const openIncidents = incidents.filter((i) => i.status !== "resuelta");
  const lastReport = reports[0];
  const first = (me.fullName || "").split(" ")[0];

  return (
    <>
      <PageHead eyebrow="Octubre 2026 · Panel Activo" title={first ? `Hola, ${first}.` : "Resumen"}>
        <Link href="/clientes/llamadas" className="btn btn-ink">
          Pedir una llamada
        </Link>
      </PageHead>

      {sp.bienvenida === "1" && (
        <p className="pc-msg is-ok" role="status">
          Contraseña guardada. Ya puedes entrar cuando quieras con tu email.
        </p>
      )}

      {octLeadsCount === 0 && octRows.length === 0 ? (
        <Empty>
          Aún no hay datos de campañas en este período. En cuanto se sincronicen los primeros leads verás aquí tus
          métricas de Google y Meta.
        </Empty>
      ) : (
        <>
          {/* ── 1. Stat Tiles Principales de Octubre ── */}
          <div className="pc-stats">
            <StatTile label="Leads en Octubre" value={fmt.int(octLeadsCount)} vs="mes en curso" />
            <StatTile
              label="Coste por lead (CPL)"
              value={fmt.eur(octCpl)}
              goodWhenUp={false}
              vs="inversión media"
              hot
            />
            <StatTile label="Inversión total" value={fmt.eur0(octSpend)} neutral vs="Octubre" />
            <StatTile label="Clientes cerrados" value={fmt.int(octClosedCount)} vs="ventas confirmadas" />
            <StatTile
              label={hasEstimates ? "ROAS (Mixto)" : "ROAS (Real)"}
              value={octRoas != null ? `${octRoas.toFixed(2)}x` : "—"}
              vs={fmt.eur0(octTotalRevenue)}
              neutral
            />
          </div>

          {/* ── 2. Gráfica Semanal de Leads y Gasto ── */}
          <Card>
            <LeadsChart
              points={weeks}
              title="Evolución de Leads por semana"
              caption="Últimas 12 semanas. Pasa el cursor por cada barra para consultar el detalle de leads y gasto."
            />
          </Card>

          {/* ── 3. Cuadrícula de Análisis: Operativa, Anuncios, Ubicaciones y Canales ── */}
          <div className="pc-grid-2">
            {/* Card A: Operativa de Leads */}
            <Card title="Operativa de Leads" action={<span className="pc-muted">Octubre</span>}>
              <div style={{ padding: "6px 0" }}>
                <RatioBar
                  leftLabel="📞 Llamadas"
                  leftCount={callCount}
                  rightLabel="💬 Mensajes"
                  rightCount={msgCount}
                  accent="blue"
                />
                <RatioBar
                  leftLabel="💳 Cobrados por Google"
                  leftCount={chargedCount}
                  rightLabel="⏳ En revisión Google"
                  rightCount={inReviewCount}
                  accent="green"
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: "1px solid var(--line, #e3dfd7)",
                  }}
                >
                  <div>
                    <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      Disputados / Archivados
                    </span>
                    <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
                      {disputedCount} leads
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      Facturación en Ventas
                    </span>
                    <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "#15803d" }}>
                      {fmt.eur0(octTotalRevenue)}
                      {hasEstimates && (
                        <span style={{ fontSize: 11, fontWeight: 400, color: "var(--muted)", marginLeft: 4 }}>
                          (estimado)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Card B: Rendimiento del Anuncio Google Ads */}
            <Card title="Rendimiento del Anuncio" action={<span className="pc-muted">Google Ads API</span>}>
              <div style={{ padding: "6px 0" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      Impresiones Totales
                    </span>
                    <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>
                      {fmt.int(totalImpressions)}
                    </p>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>veces mostrado el anuncio</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      Top Impression %
                    </span>
                    <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "#0284c7" }}>
                      {avgTopImp != null ? `${Math.round(avgTopImp * 100)} %` : "—"}
                    </p>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>en la parte superior de Google</span>
                  </div>
                </div>

                <div style={{ paddingTop: 14, borderTop: "1px solid var(--line, #e3dfd7)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 650 }}>Absoluto Top Impression Share (Posición #1)</span>
                    <strong>{avgAbsTopImp != null ? `${Math.round(avgAbsTopImp * 100)} %` : "—"}</strong>
                  </div>
                  <div style={{ height: 6, background: "var(--line, #e3dfd7)", borderRadius: 999, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${avgAbsTopImp != null ? Math.round(avgAbsTopImp * 100) : 0}%`,
                        background: "#0ea5e9",
                        height: "100%",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: "var(--muted)", margin: "6px 0 0" }}>
                    Porcentaje de veces que tu anuncio ocupó la primera posición absoluta en los resultados patrocinados.
                  </p>
                </div>
              </div>
            </Card>

            {/* Card C: Ranking de Ubicaciones */}
            <Card title="Ranking de Ubicaciones" action={<span className="pc-muted">{topLocations.length} zonas</span>}>
              <LocationRankingBars locations={topLocations} />
            </Card>

            {/* Card D: Desglose por Canal */}
            <Card title="Rendimiento por Canal" action={<span className="pc-muted">Octubre</span>}>
              <div className="pc-table-wrap">
                <table className="pc-table tabular">
                  <thead>
                    <tr>
                      <th scope="col">Canal</th>
                      <th scope="col">Leads</th>
                      <th scope="col">Cerrados</th>
                      <th scope="col">Inversión</th>
                      <th scope="col">CPL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelSummary.map((c) => (
                      <tr key={c.channel}>
                        <th scope="row">{channelName(c.channel)}</th>
                        <td>{fmt.int(c.leads)}</td>
                        <td>{fmt.int(c.closed)}</td>
                        <td>{fmt.eur0(c.spend)}</td>
                        <td>{fmt.eur(c.cpl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ── 4. Accesos directos y Gestión del Portal ── */}
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

        <Card title="Informes mensuales">
          {lastReport ? (
            <div className="pc-next">
              <strong>{cap(fmt.month(lastReport.period))}</strong>
              {lastReport.title && <p className="pc-muted">{lastReport.title}</p>}
              <Link href={`/clientes/informes/${lastReport.period.slice(0, 7)}`} className="pc-link">
                Leer informe →
              </Link>
            </div>
          ) : (
            <div className="pc-next">
              <p className="pc-muted">El primer informe ejecutivo mensual aparecerá aquí.</p>
              <Link href="/clientes/informes" className="pc-link">
                Ver sección informes →
              </Link>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
