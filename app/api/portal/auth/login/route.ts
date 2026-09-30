import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFirebaseAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE } from "@/lib/firebase/auth";

export async function POST(req: Request) {
  try {
    const { email, password, next } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Escribe tu email y tu contraseña." }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Falta configurar NEXT_PUBLIC_FIREBASE_API_KEY." }, { status: 500 });
    }

    // Autenticar mediante la API REST de Firebase Auth
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok) {
      const msg = verifyData.error?.message || "";
      if (msg.includes("EMAIL_NOT_FOUND") || msg.includes("INVALID_PASSWORD") || msg.includes("INVALID_LOGIN_CREDENTIALS")) {
        return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
      }
      if (msg.includes("TOO_MANY_ATTEMPTS_TRY_LATER")) {
        return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
      }
      return NextResponse.json({ error: "Error al iniciar sesión." }, { status: 400 });
    }

    const idToken = verifyData.idToken;
    const auth = getFirebaseAuth();
    // Sesión de 5 días
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    const safeNext = typeof next === "string" && /^\/clientes(\/[\w\-/]*)?$/.test(next) ? next : "/clientes";
    return NextResponse.json({ ok: true, redirect: safeNext });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
