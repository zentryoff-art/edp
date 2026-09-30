import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/clientes/login", "/clientes/recuperar", "/clientes/auth/confirm"];
const SESSION_COOKIE = "__session";

/**
 * Protege /clientes/* y /api/portal/* mediante la cookie de sesión de Firebase Auth (__session):
 *  - Sin cookie de sesión, las páginas redirigen al login y las APIs responden 401.
 * Las páginas del servidor verifican criptográficamente el token con Firebase Admin (defensa en profundidad).
 */
export async function middleware(req: NextRequest) {
  // Las Server Actions no deben ser interceptadas ni alteradas por middleware
  if (req.headers.get("next-action")) {
    return NextResponse.next();
  }

  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p + "/"));
  const sessionCookie = req.cookies.get(SESSION_COOKIE)?.value;
  const loggedIn = Boolean(sessionCookie);

  if (isPublic) {
    if (loggedIn && path === "/clientes/login") {
      return NextResponse.redirect(new URL("/clientes", req.url));
    }
    return NextResponse.next();
  }

  if (!loggedIn) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
    }
    const login = new URL("/clientes/login", req.url);
    if (path !== "/clientes") login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  const res = NextResponse.next();
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("X-Robots-Tag", "noindex");
  return res;
}

export const config = {
  matcher: ["/clientes/:path*", "/api/portal/:path*"],
};
