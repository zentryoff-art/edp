import { redirect } from "next/navigation";
import { PasswordForm } from "@/components/portal/forms";
import { getSession } from "@/lib/portal/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Tu contraseña" };

export default async function ContrasenaPage({ searchParams }: { searchParams: Promise<{ bienvenida?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/clientes/login?error=enlace");
  const welcome = (await searchParams).bienvenida === "1";
  return (
    <div className="pa-card">
      <h1 className="display pa-title">{welcome ? "Bienvenido" : "Nueva contraseña"}</h1>
      <p className="pa-sub">
        {welcome ? "Crea tu contraseña para entrar en el área de clientes." : "Elige una contraseña nueva para"} <b>{s.email}</b>
      </p>
      <PasswordForm />
    </div>
  );
}
