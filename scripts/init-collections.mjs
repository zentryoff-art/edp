#!/usr/bin/env node
/**
 * Inicializa todas las colecciones principales de Firestore con un documento de esquema / inicialización.
 */
import { getFirebaseAdmin, c, loadEnv } from "./lib/common.mjs";

const env = loadEnv();
const { db } = getFirebaseAdmin(env);

const collections = [
  {
    name: "bookings",
    desc: "Reservas de llamadas",
    sample: {
      _schema_info: "Colección para reservas de llamadas agendadas desde /llamada o el área de clientes.",
      created_at: new Date().toISOString()
    }
  },
  {
    name: "contact_requests",
    desc: "Solicitudes de auditoría y contacto",
    sample: {
      _schema_info: "Colección para formularios de contacto y auditoría web.",
      created_at: new Date().toISOString()
    }
  },
  {
    name: "clients",
    desc: "Empresas clientes",
    sample: {
      _schema_info: "Colección de empresas cliente registradas para el área privada.",
      created_at: new Date().toISOString()
    }
  },
  {
    name: "client_members",
    desc: "Membresías de usuarios en clientes",
    sample: {
      _schema_info: "Relación entre usuarios de Firebase Auth y empresas clientes.",
      created_at: new Date().toISOString()
    }
  },
  {
    name: "daily_metrics",
    desc: "Métricas diarias de publicidad",
    sample: {
      _schema_info: "Métricas de inversión, leads cualificados (1-5), ventas y facturación.",
      created_at: new Date().toISOString()
    }
  },
  {
    name: "reports",
    desc: "Informes ejecutivos mensuales",
    sample: {
      _schema_info: "Informes mensuales de progreso para cada cliente.",
      created_at: new Date().toISOString()
    }
  },
  {
    name: "incidents",
    desc: "Centro de incidencias y soporte",
    sample: {
      _schema_info: "Tickets e incidencias abiertas por clientes.",
      created_at: new Date().toISOString()
    }
  },
  {
    name: "incident_messages",
    desc: "Mensajes y chat de incidencias",
    sample: {
      _schema_info: "Mensajes del hilo de conversación de cada incidencia.",
      created_at: new Date().toISOString()
    }
  }
];

c.step("Creando colecciones visibles en la consola de Firebase Firestore...");

for (const col of collections) {
  const docRef = db.collection(col.name).doc("_init");
  await docRef.set(col.sample, { merge: true });
  c.ok(`Colección activa y visible: ${col.name.padEnd(20)} (${col.desc})`);
}

c.step("¡Listo! Ahora verás todas las colecciones en tu consola de Firestore.");
