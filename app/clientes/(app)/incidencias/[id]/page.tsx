import Link from "next/link";
import { notFound } from "next/navigation";
import { getIncident, requireMember } from "@/lib/portal/data";
import { cap, fmt } from "@/lib/portal/metrics";
import { PriorityTag, StatusChip } from "@/components/portal/ui";
import { ReplyForm } from "@/components/portal/forms";

export const metadata = { title: "Incidencia" };

export default async function IncidenciaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nueva?: string }> }) {
  const { id } = await params;
  const me = await requireMember();
  const data = await getIncident(me.client.id, id);
  if (!data) notFound();
  const { incident: i, messages } = data;
  const created = (await searchParams).nueva === "1";

  return (
    <>
      <Link href="/clientes/incidencias" className="pc-link pc-back">
        ← Incidencias
      </Link>

      {created && (
        <p className="pc-msg is-ok" role="status">
          Incidencia enviada. Te responderemos aquí mismo.
        </p>
      )}

      <header className="pc-incident-head">
        <div className="pc-incident-meta">
          <StatusChip status={i.status} />
          <PriorityTag priority={i.priority} />
          <span className="pc-tag">{i.category}</span>
        </div>
        <h1 className="display pc-h1">{i.title}</h1>
        <p className="pc-muted">
          Abierta el {fmt.dateTime(i.created_at)} · última actividad {fmt.relative(i.updated_at)}
        </p>
      </header>

      <ol className="pc-thread">
        {messages.length === 0 && <li className="pc-muted">Sin mensajes todavía.</li>}
        {messages.map((m) => (
          <li key={m.id} className={m.is_team ? "is-team" : ""}>
            <div className="pc-msg-head">
              <strong>{m.is_team ? "Equipo EDP" : m.author_name}</strong>
              <time dateTime={m.created_at} className="pc-muted" title={cap(fmt.dateTime(m.created_at))}>
                {fmt.relative(m.created_at)}
              </time>
            </div>
            <p className="pc-msg-body">{m.body}</p>
          </li>
        ))}
      </ol>

      {i.status === "resuelta" ? (
        <p className="pc-muted">
          Esta incidencia está resuelta. Si vuelve a pasar, <Link href="/clientes/incidencias/nueva">abre una nueva</Link>.
        </p>
      ) : (
        <ReplyForm incidentId={i.id} />
      )}
    </>
  );
}
