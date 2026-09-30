import "server-only";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let adminApp: App | undefined;

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
      }
      return parsed;
    } catch {
      // Ignorar si no parsea y probar variables individuales
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
    return { projectId, clientEmail, privateKey };
  }

  return null;
}

export function getFirebaseAdminApp(): App {
  if (adminApp) return adminApp;

  const existing = getApps();
  if (existing.length > 0 && existing[0]) {
    adminApp = existing[0];
    return adminApp;
  }

  const credentials = getServiceAccount();
  if (!credentials) {
    throw new Error("Faltan las credenciales de Firebase Admin (FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY).");
  }

  adminApp = initializeApp({
    credential: cert(credentials),
    projectId: credentials.projectId,
  });

  return adminApp;
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}
