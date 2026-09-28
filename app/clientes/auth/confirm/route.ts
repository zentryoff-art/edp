import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { portalMode, supabaseServer } from "@/lib/portal/supabase";

/**
 * Destino de los enlaces de invitación y de recuperación de contraseña.
 * Verifica el token, deja la sesión iniciada y lleva a crear la contraseña.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const fail = new URL("/clientes/login?error=enlace", url);

  if (portalMode !== "supabase" || !tokenHash || !type || !["invite", "recovery", "magiclink", "email"].includes(type)) {
    return NextResponse.redirect(fail);
  }

  const sb = await supabaseServer();
  const { error } = await sb.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return NextResponse.redirect(fail);

  const dest = new URL("/clientes/contrasena", url);
  if (type === "invite") dest.searchParams.set("bienvenida", "1");
  return NextResponse.redirect(dest);
}
