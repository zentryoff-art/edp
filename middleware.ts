import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SB_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const MODE = SB_URL && SB_ANON ? "supabase" : "missing";

const PUBLIC = ["/clientes/login", "/clientes/recuperar", "/clientes/auth/confirm"];

/**
 * Protege /clientes/* y /api/portal/*:
 *  - refresca la sesión de Supabase (cookies) en cada petición;
 *  - sin sesión, las páginas redirigen al login y las APIs responden 401.
 * Las páginas vuelven a comprobar la sesión en el servidor (defensa en profundidad).
 */
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p + "/"));
  let res = NextResponse.next({ request: req });
  let loggedIn = false;

  if (MODE === "supabase") {
    const sb = createServerClient(SB_URL, SB_ANON, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) req.cookies.set(name, value);
          res = NextResponse.next({ request: req });
          for (const { name, value, options } of list) res.cookies.set(name, value, options);
        },
      },
    });
    const {
      data: { user },
    } = await sb.auth.getUser();
    loggedIn = Boolean(user);
  }

  if (isPublic) {
    // Con sesión, el login lleva directamente al área.
    if (loggedIn && path === "/clientes/login") return NextResponse.redirect(new URL("/clientes", req.url));
    return res;
  }

  if (!loggedIn) {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
    const login = new URL("/clientes/login", req.url);
    if (path !== "/clientes") login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("X-Robots-Tag", "noindex");
  return res;
}

export const config = {
  matcher: ["/clientes/:path*", "/api/portal/:path*"],
};
