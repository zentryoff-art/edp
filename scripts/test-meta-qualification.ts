import assert from "node:assert/strict";
import test from "node:test";
import { processMetaLeadUpdate } from "../lib/portal/meta-sync";
import { processLsaLeadUpdate } from "../lib/portal/lsa-sync";

test("1. Meta: Venta con importe real prioritario (> 0) asigna origen 'actual'", () => {
  const initialLead = {
    id: "meta_101",
    client_id: "jg",
    channel: "meta_ads",
    status: "activo",
    phone: "+34600111222",
    advertising_source: {
      channel: "meta_ads",
      ad_account_id: "act_1132664364628348",
      campaign_id: "120256065951050002",
      external_lead_id: "ghl_101",
      external_id_kind: "ghl_contact",
    },
  };

  const res = processMetaLeadUpdate({
    currentData: initialLead,
    leadId: "meta_101",
    clientId: "jg",
    serviceKey: "mudanza_mediana",
    commercialStatus: "venta",
    priceRange: "250_500",
    saleAmount: 400,
    contactName: "Juan Pérez",
    nowIso: "2026-10-07T10:00:00.000Z",
  });

  assert.equal(res.error, undefined);
  const doc = res.resultingDoc!;

  assert.equal(doc.status, "cerrado");
  assert.equal(doc.qualification.status, "venta");
  assert.equal(doc.qualification.sale_amount, 400);
  assert.equal(doc.sale_amount, 400);

  // Señales Meta
  assert.equal(doc.computed_signals.meta_event, "Purchase");
  assert.equal(doc.computed_signals.meta_value, 400);
  assert.equal(doc.computed_signals.meta_currency, "EUR");
  assert.equal(doc.computed_signals.meta_value_source, "actual");

  // Sync encolado inicialmente
  assert.equal(doc.sync.meta_status, "pending");
  assert.equal(doc.sync.capi_sent, false);

  // advertising_source preservado
  assert.equal(res.updates!["advertising_source"], undefined);
  assert.equal(doc.advertising_source.campaign_id, "120256065951050002");
});

test("2. Meta: Venta sin importe real usa respaldo de rango y fija sale_amount en null", () => {
  const initialLead = {
    id: "meta_102",
    client_id: "jg",
    channel: "meta_ads",
    status: "activo",
    phone: "+34600222333",
  };

  const res = processMetaLeadUpdate({
    currentData: initialLead,
    leadId: "meta_102",
    clientId: "jg",
    serviceKey: "mudanza_mediana",
    commercialStatus: "venta",
    priceRange: "500_1000",
    saleAmount: undefined, // Sin importe real
    nowIso: "2026-10-07T10:00:00.000Z",
  });

  assert.equal(res.error, undefined);
  const doc = res.resultingDoc!;

  assert.equal(doc.status, "cerrado");
  assert.equal(doc.qualification.sale_amount, null);
  assert.equal(doc.sale_amount, null);

  // Señales Meta: 500 € con origen "range_estimate"
  assert.equal(doc.computed_signals.meta_event, "Purchase");
  assert.equal(doc.computed_signals.meta_value, 500);
  assert.equal(doc.computed_signals.meta_currency, "EUR");
  assert.equal(doc.computed_signals.meta_value_source, "range_estimate");
});

test("3. Meta: Valores de respaldo por rango (<250 -> 200 €, +1000 -> 1.000 €)", () => {
  const lead1 = { id: "m1", client_id: "jg", channel: "meta_ads", status: "activo" };
  const res1 = processMetaLeadUpdate({
    currentData: lead1,
    leadId: "m1",
    clientId: "jg",
    serviceKey: "mudanza_chica",
    commercialStatus: "venta",
    priceRange: "<250",
    saleAmount: undefined,
  });
  assert.equal(res1.resultingDoc!.computed_signals.meta_value, 200);
  assert.equal(res1.resultingDoc!.computed_signals.meta_value_source, "range_estimate");

  const lead2 = { id: "m2", client_id: "jg", channel: "meta_ads", status: "activo" };
  const res2 = processMetaLeadUpdate({
    currentData: lead2,
    leadId: "m2",
    clientId: "jg",
    serviceKey: "mudanza_grande",
    commercialStatus: "venta",
    priceRange: "+1000",
    saleAmount: undefined,
  });
  assert.equal(res2.resultingDoc!.computed_signals.meta_value, 1000);
  assert.equal(res2.resultingDoc!.computed_signals.meta_value_source, "range_estimate");
});

test("4. Meta: Venta sin importe real y sin rango retorna error exigiendo alguno", () => {
  const lead = { id: "m3", client_id: "jg", channel: "meta_ads", status: "activo" };
  const res = processMetaLeadUpdate({
    currentData: lead,
    leadId: "m3",
    clientId: "jg",
    serviceKey: "mudanza_mediana",
    commercialStatus: "venta",
    priceRange: null,
    saleAmount: undefined,
  });

  assert.match(res.error || "", /Debes indicar el importe real o seleccionar un rango/);
});

test("5. Meta: Bloqueo transaccional de venta ya cerrada", () => {
  const soldLead = {
    id: "meta_closed",
    client_id: "jg",
    channel: "meta_ads",
    status: "cerrado",
    qualification: {
      service: "mudanza_mediana",
      status: "venta",
      sale_amount: 500,
    },
    sync: {
      meta_status: "done",
      meta_sent_at: "2026-10-07T09:00:00.000Z",
      capi_sent: true,
    },
  };

  const res = processMetaLeadUpdate({
    currentData: soldLead,
    leadId: "meta_closed",
    clientId: "jg",
    commercialStatus: "venta",
    saleAmount: 800, // Intento de editar importe
    contactName: "Nombre Editado",
  });

  assert.equal(res.error, "Este lead de Meta ya tiene una venta cerrada definitiva y no puede ser modificado.");
});

test("6. Meta: Preservar sync si el evento Meta no cambia", () => {
  const leadInConv = {
    id: "meta_conv",
    client_id: "jg",
    channel: "meta_ads",
    status: "en_conversacion",
    computed_signals: {
      meta_event: "QualifiedLead",
      internal_rating: 4,
    },
    sync: {
      meta_status: "done",
      meta_sent_at: "2026-10-07T08:00:00.000Z",
      capi_sent: true,
    },
  };

  // Guardar cambio de nombre en el lead sin cambiar el evento QualifiedLead
  const res = processMetaLeadUpdate({
    currentData: leadInConv,
    leadId: "meta_conv",
    clientId: "jg",
    serviceKey: "mudanza_mediana",
    commercialStatus: "en_conversacion",
    contactName: "Nuevo Nombre",
  });

  assert.equal(res.error, undefined);
  // sync.meta_status NO debe volver a pending, debe preservarse
  assert.equal(res.updates!["sync.meta_status"], undefined);
  assert.equal(res.resultingDoc!.sync.meta_status, "done");
  assert.equal(res.resultingDoc!.contact_name, "Nuevo Nombre");
});

test("7. LSA: Venta sin importe real exige rango y usa respaldo para tracking", () => {
  const leadLsa = {
    id: "lsa_est",
    client_id: "jg",
    channel: "google_lsa",
    status: "activo",
    phone: "+34600123456",
  };

  const res = processLsaLeadUpdate({
    currentData: leadLsa,
    leadId: "lsa_est",
    clientId: "jg",
    serviceKey: "mudanza_mediana",
    commercialStatus: "venta",
    priceRange: "500_1000",
    saleAmount: undefined,
  });

  assert.equal(res.error, undefined);
  const doc = res.resultingDoc!;

  assert.equal(doc.status, "cerrado");
  assert.equal(doc.qualification.sale_amount, null);
  assert.equal(doc.sale_amount, null);
  assert.equal(doc.tracking.price_estimate, 500); // Estimación en tracking
});
