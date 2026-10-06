import assert from "node:assert/strict";
import test from "node:test";
import { processLsaLeadUpdate, applyDotNotationUpdates, validateSaleAmount } from "../lib/portal/lsa-sync";
import type { LeadSync } from "../lib/portal/types";

test("1. Venta sin importe: permite guardar 'venta' sin forzar 0", () => {
  const initialLead = {
    id: "lsa_101",
    client_id: "jg",
    channel: "google_lsa",
    status: "activo",
    contact_name: "María Gómez",
    phone: "+34600111222",
  };

  const res = processLsaLeadUpdate({
    currentData: initialLead,
    leadId: "lsa_101",
    clientId: "jg",
    serviceKey: "mudanza_mediana",
    commercialStatus: "venta",
    saleAmount: undefined, // Importe omitido / no especificado
    contactName: "María Gómez",
    nowIso: "2026-10-06T10:00:00.000Z",
  });

  assert.equal(res.error, undefined);
  const doc = res.resultingDoc!;

  assert.equal(doc.status, "cerrado");
  assert.equal(doc.qualification.status, "venta");
  // No debe convertirse a 0, debe ser null
  assert.equal(doc.qualification.sale_amount, null);
  assert.equal(doc.sale_amount, undefined);

  // Playwright y Tracking encolados
  assert.equal(doc.sync.playwright_action, "booked");
  assert.equal(doc.sync.playwright_status, "pending");
  assert.equal(doc.sync.tracking_status, "pending");
  assert.equal(doc.tracking.customer_name, "María Gómez");
  assert.equal(doc.tracking.price_estimate, undefined);
  assert.equal(doc.tracking.revision, 1);
});

test("2. Calificación hoy y cierre posterior: rating inicial y Playwright diferido", () => {
  // Paso A: Calificación inicial en conversación
  const initialLead = {
    id: "lsa_102",
    client_id: "palma",
    channel: "google_lsa",
    status: "activo",
    phone: "+34600333444",
  };

  const resStep1 = processLsaLeadUpdate({
    currentData: initialLead,
    leadId: "lsa_102",
    clientId: "palma",
    serviceKey: "mudanza_mediana",
    commercialStatus: "en_conversacion",
    nowIso: "2026-10-06T10:00:00.000Z",
  });

  const docStep1 = resStep1.resultingDoc!;
  assert.equal(docStep1.status, "en_conversacion");
  assert.equal(docStep1.sync.api_status, "pending");
  assert.equal(docStep1.sync.playwright_status, undefined);
  assert.equal(docStep1.tracking, undefined);

  // Paso B: VPS procesa y confirma rating
  docStep1.sync.api_status = "done";
  docStep1.sync.api_sent_at = "2026-10-06T10:05:00.000Z";

  // Paso C: Usuario cierra la venta posteriormente
  const resStep2 = processLsaLeadUpdate({
    currentData: docStep1,
    leadId: "lsa_102",
    clientId: "palma",
    commercialStatus: "venta",
    saleAmount: 650,
    contactName: "Pedro Romero",
    nowIso: "2026-10-06T11:00:00.000Z",
  });

  const docStep2 = resStep2.resultingDoc!;
  assert.equal(docStep2.status, "cerrado");
  // El rating previo debe conservarse en 'done', ¡no reencolarse!
  assert.equal(docStep2.sync.api_status, "done");
  assert.equal(docStep2.sync.api_sent_at, "2026-10-06T10:05:00.000Z");

  // Playwright encolado
  assert.equal(docStep2.sync.playwright_action, "booked");
  assert.equal(docStep2.sync.playwright_status, "pending");
  assert.equal(docStep2.qualification.sale_amount, 650);
  assert.equal(docStep2.tracking.price_estimate, 650);
  assert.equal(docStep2.tracking.revision, 1);
});

test("3. Nombre o importe editado después de Booked sin reenviar rating/cierre", () => {
  const closedBookedLead = {
    id: "lsa_103",
    client_id: "jg",
    channel: "google_lsa",
    status: "cerrado",
    contact_name: "Lucía",
    qualification: {
      service: "mudanza_mediana",
      status: "venta",
      sale_amount: 500,
      qualified_at: "2026-10-05T09:00:00.000Z",
    },
    computed_signals: {
      internal_rating: 4,
      lsa_sentiment: "SATISFIED",
      lsa_reason: "BOOKED_CUSTOMER",
    },
    sync: {
      api_status: "done",
      api_sent_at: "2026-10-05T09:02:00.000Z",
      playwright_action: "booked",
      playwright_status: "done",
      tracking_status: "done",
      tracking_synced_revision: 1,
    },
    tracking: {
      customer_name: "Lucía",
      price_estimate: 500,
      revision: 1,
    },
    sale_amount: 500,
  };

  // Se edita el nombre a "Lucía Martínez" y el importe a 800
  const res = processLsaLeadUpdate({
    currentData: closedBookedLead,
    leadId: "lsa_103",
    clientId: "jg",
    commercialStatus: "venta",
    saleAmount: 800,
    contactName: "Lucía Martínez",
    nowIso: "2026-10-06T12:00:00.000Z",
  });

  const doc = res.resultingDoc!;
  // Rating API y Playwright permanecen en 'done'
  assert.equal(doc.sync.api_status, "done");
  assert.equal(doc.sync.api_sent_at, "2026-10-05T09:02:00.000Z");
  assert.equal(doc.sync.playwright_status, "done");

  // Señales de rating intactas
  assert.equal(doc.computed_signals.lsa_sentiment, "SATISFIED");
  assert.equal(doc.computed_signals.lsa_reason, "BOOKED_CUSTOMER");

  // Tracking actualizado a rev 2 y encolado
  assert.equal(doc.tracking.customer_name, "Lucía Martínez");
  assert.equal(doc.tracking.price_estimate, 800);
  assert.equal(doc.tracking.revision, 2);
  assert.equal(doc.sync.tracking_status, "pending");
  assert.equal(doc.sync.tracking_synced_revision, 1); // Conserva la última confirmada
});

test("4. Guardado idéntico sin nueva revisión: no incrementa revisión ni reencola", () => {
  const currentLead = {
    id: "lsa_104",
    client_id: "jg",
    channel: "google_lsa",
    status: "cerrado",
    contact_name: "Carlos Ruiz",
    qualification: {
      service: "mudanza_grande",
      status: "venta",
      sale_amount: 1200,
    },
    sync: {
      api_status: "done",
      playwright_action: "booked",
      playwright_status: "done",
      tracking_status: "done",
      tracking_synced_revision: 2,
    },
    tracking: {
      customer_name: "Carlos Ruiz",
      price_estimate: 1200,
      revision: 2,
    },
    sale_amount: 1200,
  };

  // Guardado idéntico
  const res = processLsaLeadUpdate({
    currentData: currentLead,
    leadId: "lsa_104",
    clientId: "jg",
    commercialStatus: "venta",
    saleAmount: 1200,
    contactName: "Carlos Ruiz",
    nowIso: "2026-10-06T12:30:00.000Z",
  });

  const doc = res.resultingDoc!;
  // La revisión no debe incrementarse
  assert.equal(doc.tracking.revision, 2);
  // tracking_status no debe volver a pending
  assert.equal(doc.sync.tracking_status, "done");
  assert.equal(res.updates!["tracking"], undefined);
  assert.equal(res.updates!["sync.tracking_status"], undefined);
});

test("5. Importe omitido conserva el existente: no se borra ni se fuerza a 0", () => {
  const closedLead = {
    id: "lsa_105",
    client_id: "shalom",
    channel: "google_lsa",
    status: "cerrado",
    contact_name: "Elena",
    qualification: {
      service: "mudanza_mediana",
      status: "venta",
      sale_amount: 450,
    },
    sync: {
      playwright_action: "booked",
      playwright_status: "done",
      tracking_status: "done",
    },
    tracking: {
      customer_name: "Elena",
      price_estimate: 450,
      revision: 1,
    },
    sale_amount: 450,
  };

  // Solo se edita el nombre a "Elena Morales", omitiendo importe
  const res = processLsaLeadUpdate({
    currentData: closedLead,
    leadId: "lsa_105",
    clientId: "shalom",
    commercialStatus: "venta",
    saleAmount: undefined, // Omitido
    contactName: "Elena Morales",
    nowIso: "2026-10-06T13:00:00.000Z",
  });

  const doc = res.resultingDoc!;
  // Debe conservar 450
  assert.equal(doc.qualification.sale_amount, 450);
  assert.equal(doc.sale_amount, 450);
  assert.equal(doc.tracking.price_estimate, 450);
  assert.equal(doc.tracking.customer_name, "Elena Morales");
  assert.equal(doc.tracking.revision, 2);
});

test("6. Dos ediciones concurrentes sin pérdida de revisiones", () => {
  let dbDoc = {
    id: "lsa_106",
    client_id: "jg",
    channel: "google_lsa",
    status: "cerrado",
    contact_name: "Ana",
    qualification: { service: "mudanza_mediana", status: "venta", sale_amount: 300 },
    sync: { playwright_action: "booked", playwright_status: "done", tracking_status: "done" },
    tracking: { customer_name: "Ana", price_estimate: 300, revision: 1 },
    sale_amount: 300,
  };

  // Transacción 1: Actualiza nombre
  const res1 = processLsaLeadUpdate({
    currentData: dbDoc,
    leadId: "lsa_106",
    clientId: "jg",
    commercialStatus: "venta",
    contactName: "Ana Belén",
    nowIso: "2026-10-06T14:00:00.000Z",
  });
  dbDoc = res1.resultingDoc as any;
  assert.equal(dbDoc.tracking.revision, 2);
  assert.equal(dbDoc.tracking.customer_name, "Ana Belén");

  // Transacción 2: Actualiza importe sobre el documento actualizado
  const res2 = processLsaLeadUpdate({
    currentData: dbDoc,
    leadId: "lsa_106",
    clientId: "jg",
    commercialStatus: "venta",
    saleAmount: 380,
    nowIso: "2026-10-06T14:00:01.000Z",
  });
  dbDoc = res2.resultingDoc as any;
  assert.equal(dbDoc.tracking.revision, 3);
  assert.equal(dbDoc.tracking.customer_name, "Ana Belén");
  assert.equal(dbDoc.tracking.price_estimate, 380);
});

test("7. LSA sin cola Meta: meta_status permanece nulo", () => {
  const leadLsa = {
    id: "lsa_107",
    client_id: "jg",
    channel: "google_lsa",
    status: "activo",
    phone: "+34600999888",
  };

  const res = processLsaLeadUpdate({
    currentData: leadLsa,
    leadId: "lsa_107",
    clientId: "jg",
    serviceKey: "mudanza_grande",
    commercialStatus: "venta",
    saleAmount: 1500,
    nowIso: "2026-10-06T15:00:00.000Z",
  });

  const doc = res.resultingDoc!;
  assert.equal(doc.sync.meta_status, null);
  assert.equal(doc.sync.capi_sent, undefined);
  assert.equal(res.updates!["sync.meta_status"], null);
});

test("8. Campo opcional location: se preserva intacto sin modificar al calificar o cerrar", () => {
  const leadWithLocation = {
    id: "lsa_108",
    client_id: "jg",
    channel: "google_lsa",
    status: "activo",
    phone: "+34600444555",
    location: {
      display_name: "Zaragoza Centro",
      source: "lsa_ui",
      fetched_at: "2026-10-06T09:00:00.000Z",
    },
  };

  const res = processLsaLeadUpdate({
    currentData: leadWithLocation,
    leadId: "lsa_108",
    clientId: "jg",
    serviceKey: "mudanza_mediana",
    commercialStatus: "venta",
    saleAmount: 600,
    nowIso: "2026-10-06T10:00:00.000Z",
  });

  const doc = res.resultingDoc!;
  // location no debe sufrir alteraciones en updates ni en el doc resultante
  assert.equal(res.updates!["location"], undefined);
  assert.deepEqual(doc.location, {
    display_name: "Zaragoza Centro",
    source: "lsa_ui",
    fetched_at: "2026-10-06T09:00:00.000Z",
  });
});
