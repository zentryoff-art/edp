/** Utilidades compartidas por los scripts de administración en Firebase. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const c = {
  ok: (s) => console.log(`\x1b[32m✓\x1b[0m ${s}`),
  warn: (s) => console.log(`\x1b[33m!\x1b[0m ${s}`),
  err: (s) => console.error(`\x1b[31m✗\x1b[0m ${s}`),
  step: (s) => console.log(`\n\x1b[1m${s}\x1b[0m`),
  dim: (s) => console.log(`\x1b[2m  ${s}\x1b[0m`),
};

/** .env + .env.local + variables del sistema */
export function loadEnv() {
  const env = {};
  for (const name of [".env", ".env.local"]) {
    const file = path.join(ROOT, name);
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf8");
      const regex = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?$/gm;
      let match;
      while ((match = regex.exec(content)) !== null) {
        let val = (match[2] || "").trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[match[1]] = val;
      }
    }
  }
  return { ...env, ...process.env };
}

/** --clave valor  y  --bandera  →  { clave: "valor", bandera: true } */
export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) out[k] = true;
      else {
        out[k] = v;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

export function slugify(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getFirebaseAdmin(env = loadEnv()) {
  if (getApps().length > 0) {
    return {
      db: getFirestore(),
      auth: getAuth(),
    };
  }

  let creds = null;
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      creds = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
      if (creds.private_key) {
        creds.private_key = creds.private_key.replace(/\\n/g, "\n");
      }
    } catch {}
  }

  if (!creds && env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    creds = {
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  if (!creds) {
    c.err("Faltan las credenciales de Firebase en el archivo .env");
    process.exit(1);
  }

  const app = initializeApp({
    credential: cert(creds),
    projectId: creds.projectId,
  });

  return {
    db: getFirestore(app),
    auth: getAuth(app),
  };
}

export async function clientBySlug(db, slug) {
  const snap = await db.collection("clients").where("slug", "==", slug).limit(1).get();
  if (snap.empty) {
    c.err(`No existe el cliente «${slug}». Créalo con: npm run client:add -- --empresa "Nombre" --email ...`);
    process.exit(1);
  }
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}
