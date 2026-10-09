import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/clientes/login", "/clientes/recuperar", "/clientes/auth/confirm"];
const SESSION_COOKIE = "__session";

/**
 * Middleware unificado para Estudio Digital Pro:
 *  1. Subdominio app.estudiodigitalpro.com:
 *     - Reescribe transparentemente la raíz y rutas hacia /clientes/* (ej: / -> /clientes, /leads -> /clientes/leads).
 *     - Protege el acceso con la cookie __session.
 *  2. Dominio principal estudiodigitalpro.com:
 *     - Pasa intactas las páginas públicas de marketing.
 *     - Protege /clientes/* y /api/portal/* mediante __session.
 */
export async function middleware(req: NextRequest) {
  // Las Server Actions no deben ser interceptadas ni alteradas por middleware
  if (req.headers.get("next-action")) {
    return NextResponse.next();
  }

  const hostname = (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    req.nextUrl.hostname ||
    ""
  ).toLowerCase();
  const isAppSubdomain =
    hostname.startsWith("app.") ||
    hostname.includes("app.estudiodigitalpro.com");

  const path = req.nextUrl.pathname;

  // 1. Si NO es el subdominio app.*, solo procesamos /clientes y /api/portal
  if (!isAppSubdomain) {
    if (!path.startsWith("/clientes") && !path.startsWith("/api/portal")) {
      return NextResponse.next();
    }
  }

  // 2. Determinar ruta destino en el portal
  let targetPath = path;
  if (isAppSubdomain) {
    if (path.startsWith("/api/portal")) {
      targetPath = path;
    } else if (path.startsWith("/clientes")) {
      targetPath = path;
    } else {
      targetPath = path === "/" ? "/clientes" : `/clientes${path}`;
    }
  }

  const isPublic = PUBLIC.some((p) => targetPath === p || targetPath.startsWith(p + "/"));
  const sessionCookie = req.cookies.get(SESSION_COOKIE)?.value;
  const loggedIn = Boolean(sessionCookie);

  // 3. Manejo de rutas públicas (login, recuperar contraseña)
  if (isPublic) {
    if (loggedIn && targetPath === "/clientes/login") {
      const redirectUrl = isAppSubdomain
        ? new URL("/", req.url)
        : new URL("/clientes", req.url);
      return NextResponse.redirect(redirectUrl);
    }

    if (isAppSubdomain && targetPath !== path) {
      return NextResponse.rewrite(new URL(targetPath, req.url));
    }
    return NextResponse.next();
  }

  // 4. Manejo de usuarios no autenticados
  if (!loggedIn) {
    if (targetPath.startsWith("/api/")) {
      return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
    }

    const loginUrl = isAppSubdomain
      ? new URL("/login", req.url)
      : new URL("/clientes/login", req.url);

    if (isAppSubdomain) {
      if (path !== "/" && path !== "/login") {
        loginUrl.searchParams.set("next", path);
      }
    } else {
      if (path !== "/clientes" && path !== "/clientes/login") {
        loginUrl.searchParams.set("next", path);
      }
    }

    return NextResponse.redirect(loginUrl);
  }

  // 5. Usuario autenticado: reescribir si estamos en subdominio app.*
  const res =
    isAppSubdomain && targetPath !== path
      ? NextResponse.rewrite(new URL(targetPath, req.url))
      : NextResponse.next();

  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("X-Robots-Tag", "noindex");
  return res;
}

export const config = {
  matcher: [
    /*
     * Intercepta todas las rutas excepto archivos estáticos del compilador y recursos públicos
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)",
  ],
};
