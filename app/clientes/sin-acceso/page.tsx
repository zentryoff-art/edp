import { redirect } from "next/navigation";
import { getSession } from "@/lib/portal/data";
import { signOut } from "../actions";
import { CONTACT } from "@/lib/contact";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sin acceso" };

export default async function SinAccesoPage() {
  const s = await getSession();
  if (!s) redirect("/clientes/login");
  if (s.member) redirect("/clientes");
  return (
    <div className="pa">
      <header className="pa-top">
        <Logo size={16} />
      </header>
      <main className="pa-main">
        <div className="pa-card">
          <h1 className="display pa-title">Tu cuenta aún no tiene acceso</h1>
          <p className="pa-sub">
            Has entrado como <b>{s.email}</b>, pero no está asociada a ningún cliente. Escríbenos a{" "}
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> y lo activamos.
          </p>
          <form action={signOut}>
            <button className="btn btn-ink" type="submit">
              Salir
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
