import Link from "next/link";
import { LoginForm } from "@/components/portal/forms";
import { portalMode } from "@/lib/portal/supabase";
import { Scale } from "@/components/Scale";

export const dynamic = "force-dynamic";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/clientes") ? sp.next : "/clientes";
  return (
    <div className="pa-card">
      <Scale score={5} size={14} gap={3} label="" />
      <h1 className="display pa-title">Área de clientes</h1>
      <p className="pa-sub">Tus informes, tus llamadas y tus incidencias, en un solo sitio.</p>

      {sp.error === "enlace" && (
        <p className="pc-msg is-error" role="alert">
          El enlace no es válido o ha caducado. Pide uno nuevo en «¿Has olvidado tu contraseña?».
        </p>
      )}
      {portalMode === "missing" && (
        <p className="pc-msg is-error">El área de clientes no está configurada todavía.</p>
      )}

      <LoginForm next={next} />
      <p className="pa-alt">
        <Link href="/clientes/recuperar">¿Has olvidado tu contraseña?</Link>
      </p>
      <p className="pa-note">
        El acceso es solo para clientes. Si trabajas con nosotros y no tienes cuenta, pídenosla.
      </p>
    </div>
  );
}
