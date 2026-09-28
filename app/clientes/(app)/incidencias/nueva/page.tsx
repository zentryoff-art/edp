import Link from "next/link";
import { requireMember } from "@/lib/portal/data";
import { Card, PageHead } from "@/components/portal/ui";
import { IncidentForm } from "@/components/portal/forms";

export const metadata = { title: "Nueva incidencia" };

export default async function NuevaIncidenciaPage() {
  await requireMember();
  return (
    <>
      <Link href="/clientes/incidencias" className="pc-link pc-back">
        ← Incidencias
      </Link>
      <PageHead eyebrow="Incidencias" title="Cuéntanos qué pasa" />
      <Card>
        <p className="pc-muted pc-card-intro">Te respondemos en horario laborable. Si es urgente y afecta a tus campañas, márcala como urgente y llámanos.</p>
        <IncidentForm />
      </Card>
    </>
  );
}
