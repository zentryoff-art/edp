import "server-only";
import { cookies } from "next/headers";
import { getFirebaseAuth } from "./admin";

export const SESSION_COOKIE = "__session";

export const portalMode: "firebase" | "missing" =
  process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? "firebase"
    : "missing";

/**
 * Obtiene el usuario autenticado a través de la cookie de sesión de Firebase Auth.
 */
export async function getFirebaseUser() {
  if (portalMode === "missing") return null;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  try {
    const auth = getFirebaseAuth();
    const decoded = await auth.verifySessionCookie(sessionCookie, false);
    return decoded;
  } catch {
    return null;
  }
}
