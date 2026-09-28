import Link from "next/link";
import { getIncidents, requireMember } from "@/lib/portal/data";
import { fmt } from "@/lib/portal/metrics";
import { Empty, PageHead, PriorityTag, StatusChip } from "@/components/portal/ui";

export const metadata = { title: "Incidencias" };

export default async function IncidenciasPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const me = await requireMember();
  const all = await getIncidents(me.client.id);
  const filter = (await searchParams).estado === "resueltas" ? "resueltas" : "abiertas";
  const list = all.filter((i) => (filter === "resueltas" ? i.status === "resuelta" : i.status !== "resuelta"));
  const openCount = all.filter((i) => i.status !== "resuelta").length;

  return (
    <>
      <PageHead eyebrow="Incidencias" title="Incidencias">
        <Link href="/clientes/incidencias/nueva" className="btn btn-accent">
          Nueva incidencia <span className="arrow">→</span>
        </Link>
      </PageHead>

      <nav className="pc-tabs" aria-label="Filtrar incidencias">
        <Link href="/clientes/incidencias" className={filter === "abiertas" ? "is-active" : ""} aria-current={filter === "abiertas" ? "page" : undefined}>
          Abiertas <span className="tabular">{openCount}</span>
        </Link>
        <Link
          href="/clientes/incidencias?estado=resueltas"
          className={filter === "resueltas" ? "is-active" : ""}
          aria-current={filter === "resueltas" ? "page" : undefined}
        >
          Resueltas <span className="tabular">{all.length - openCount}</span>
        </Link>
      </nav>

      {list.length === 0 ? (
        <Empty>{filter === "abiertas" ? "No tienes incidencias abiertas." : "Todavía no hay incidencias resueltas."}</Empty>
      ) : (
        <ul className="pc-incidents">
          {list.map((i) => (
            <li key={i.id}>
              <Link href={`/clientes/incidencias/${i.id}`} className="pc-incident-row">
                <span className="pc-incident-main">
                  <strong>{i.title}</strong>
                  <span className="pc-muted">
                    {i.category} · actualizada {fmt.relative(i.updated_at)}
                  </span>
                </span>
                <span className="pc-incident-meta">
                  <PriorityTag priority={i.priority} />
                  <StatusChip status={i.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
