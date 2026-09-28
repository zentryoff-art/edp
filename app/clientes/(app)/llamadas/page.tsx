import { getBookings, requireMember } from "@/lib/portal/data";
import { cap, fmt } from "@/lib/portal/metrics";
import { Card, Empty, PageHead } from "@/components/portal/ui";
import { PortalBooking } from "@/components/portal/forms";

export const metadata = { title: "Llamadas" };

export default async function LlamadasPage() {
  const me = await requireMember();
  const bookings = await getBookings(me.client.id);
  const now = new Date().toISOString();
  const upcoming = bookings.filter((b) => b.status === "confirmed" && b.starts_at > now).reverse();
  const past = bookings.filter((b) => !(b.status === "confirmed" && b.starts_at > now));

  return (
    <>
      <PageHead eyebrow="Llamadas de 20 minutos" title="Llamadas" />

      <div className="pc-calls">
        <div className="pc-calls-book">
          <Card title="Pedir una llamada">
            <p className="pc-muted pc-card-intro">Elige día y hora. Te llamamos al teléfono que indiques; te llegará la invitación por correo.</p>
            <PortalBooking booker={{ name: me.fullName || me.email, company: me.client.name, email: me.email }} />
          </Card>
        </div>

        <div className="pc-calls-list">
          <Card title="Próximas">
            {upcoming.length ? (
              <ul className="pc-call-list">
                {upcoming.map((b) => (
                  <li key={b.id} className="is-upcoming">
                    <strong>{cap(fmt.dateTime(b.starts_at))}</strong>
                    {b.notes && <span className="pc-muted">{b.notes}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No tienes llamadas programadas.</Empty>
            )}
          </Card>
          <Card title="Anteriores">
            {past.length ? (
              <ul className="pc-call-list">
                {past.slice(0, 10).map((b) => (
                  <li key={b.id}>
                    <span>
                      {cap(fmt.dateTime(b.starts_at))}
                      {b.status === "cancelled" && <span className="pc-tag"> cancelada</span>}
                    </span>
                    {b.notes && <span className="pc-muted">{b.notes}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pc-muted">Aún no hemos tenido ninguna.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
