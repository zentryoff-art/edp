/**
 * Clientes de Supabase para el área de clientes.
 *  - supabaseServer(): con la sesión del usuario (cookies) → RLS decide qué ve.
 *  - supabaseAdmin(): service role, solo para generar enlaces de acceso.
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY; sin ellas el
 * área de clientes no arranca.
 */
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const SB_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
export const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const portalMode: "supabase" | "missing" = SB_URL && SB_ANON ? "supabase" : "missing";

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(SB_URL, SB_ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Llamado desde un Server Component: el middleware ya refresca la sesión.
        }
      },
    },
  });
}

export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SB_URL || !key) throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(SB_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
