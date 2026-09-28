import Link from "next/link";
import { ResetForm } from "@/components/portal/forms";

export const metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <div className="pa-card">
      <h1 className="display pa-title">Recupera tu contraseña</h1>
      <p className="pa-sub">Te enviamos un enlace para elegir una nueva.</p>
      <ResetForm />
      <p className="pa-alt">
        <Link href="/clientes/login">← Volver a entrar</Link>
      </p>
    </div>
  );
}
