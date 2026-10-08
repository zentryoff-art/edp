"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { getClientFirestore } from "@/lib/firebase/client";
import type {
  Lead,
  LeadChannel,
  LeadStatus,
  QualificationServiceKey,
  PriceRangeKey,
  CommercialActionStatus,
} from "@/lib/portal/types";
import {
  QUALIFICATION_SERVICES,
  PRICE_RANGES,
  isDiscardService,
  getServiceLabel,
  getPriceRangeLabel,
  normalizePriceRange,
  getPriceRangeEstimate,
  normalizeLeadDoc,
  getAdvertisingSourceInfo,
  extractLeadMessage,
} from "@/lib/portal/qualification";
import { updateLeadAction } from "@/app/clientes/actions";

export function LeadsView({
  initialLeads,
  clientId,
}: {
  initialLeads: Lead[];
  clientId?: string;
}) {
  // Corte operativo: Solo leads de octubre 2026 en adelante para calificación activa
  const OPERATIONAL_CUTOFF_DATE = "2026-10-01";

  const [leads, setLeads] = useState<Lead[]>(() =>
    initialLeads.filter((l) => (l.created_at || "") >= OPERATIONAL_CUTOFF_DATE)
  );
  const [channelFilter, setChannelFilter] = useState<"all" | LeadChannel>("all");
  const [timeTab, setTimeTab] = useState<"hoy" | "semana" | "mes" | "historico">("hoy");
  const [statusSubTab, setStatusSubTab] = useState<"sin_calificar" | "en_conversacion" | "cerrados">("sin_calificar");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messageModalLead, setMessageModalLead] = useState<Lead | null>(null);

  // Escucha en tiempo real con Firestore Client SDK (onSnapshot) para sincronización con Hermes / VPS
  const resolvedClientId = clientId || initialLeads[0]?.client_id;

  // Sincronizar estado cuando cambia el cliente activo desde el servidor
  useEffect(() => {
    setLeads(initialLeads.filter((l) => (l.created_at || "") >= OPERATIONAL_CUTOFF_DATE));
    setSelectedLead(null);
  }, [clientId, initialLeads]);

  useEffect(() => {
    if (!resolvedClientId) return;

    try {
      const db = getClientFirestore();
      // Escucha reactiva en ambas sub-colecciones por canal: leads_lsa y leads_meta
      const lsaCol = collection(db, "clients", resolvedClientId, "leads_lsa");
      const metaCol = collection(db, "clients", resolvedClientId, "leads_meta");

      let currentLsa: Lead[] = [];
      let currentMeta: Lead[] = [];

      const syncState = () => {
        const combined = [...currentLsa, ...currentMeta];
        combined.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        if (combined.length > 0 || initialLeads.length === 0) {
          setLeads(combined);
          setSelectedLead((curr) => {
            if (!curr) return null;
            const updated = combined.find((l) => l.id === curr.id);
            return updated || curr;
          });
        }
      };

      const unsubLsa = onSnapshot(
        lsaCol,
        (snapshot) => {
          currentLsa = snapshot.docs
            .filter((d) => d.id !== "_init")
            .map((d) => normalizeLeadDoc(d.id, { channel: "google_lsa", ...d.data() }))
            .filter((l) => (l.created_at || "") >= OPERATIONAL_CUTOFF_DATE);
          syncState();
        },
        (error) => console.warn("[portal] Realtime LSA listener notice:", error.message)
      );

      const unsubMeta = onSnapshot(
        metaCol,
        (snapshot) => {
          currentMeta = snapshot.docs
            .filter((d) => d.id !== "_init")
            .map((d) => normalizeLeadDoc(d.id, { channel: "meta_ads", ...d.data() }))
            .filter((l) => (l.created_at || "") >= OPERATIONAL_CUTOFF_DATE);
          syncState();
        },
        (error) => console.warn("[portal] Realtime Meta listener notice:", error.message)
      );

      return () => {
        unsubLsa();
        unsubMeta();
      };
    } catch (err) {
      console.warn("[portal] Could not initialize Firestore realtime listener:", err);
    }
  }, [resolvedClientId]);

  // Fechas de corte
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // Lunes = 0
  const startOfWeek = new Date(startOfToday - dayOfWeek * 86400000).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // 1. Filtrado por canal
  const channelFiltered = leads.filter((l) => {
    if (channelFilter === "all") return true;
    return l.channel === channelFilter;
  });

  // 2. Filtrado por Pestaña Temporal Principal (Hoy, Esta Semana, Este Mes, Histórico)
  const timeFiltered = channelFiltered.filter((l) => {
    if (timeTab === "historico") return true;
    const leadTime = new Date(l.created_at).getTime();

    if (timeTab === "hoy") {
      return leadTime >= startOfToday;
    }
    if (timeTab === "semana") {
      return leadTime >= startOfWeek && leadTime < startOfToday;
    }
    if (timeTab === "mes") {
      return leadTime >= startOfMonth;
    }
    return true;
  });

  // 3. Filtrado por Subpestaña de Estado de Trabajo:
  // - sin_calificar: sin calificación registrada y status activo
  // - en_conversacion: status 'en_conversacion' o calificado sin cerrar
  // - cerrados: status 'cerrado' (venta) o 'rechazado' (descartado)
  const isSinCalificar = (l: Lead) =>
    !l.qualification?.service &&
    !l.score &&
    l.status !== "en_conversacion" &&
    l.status !== "cerrado" &&
    l.status !== "rechazado";
  const isEnConversacion = (l: Lead) =>
    l.status === "en_conversacion" ||
    l.qualification?.status === "en_conversacion" ||
    (Boolean(l.qualification?.service || l.score) && l.status !== "cerrado" && l.status !== "rechazado");
  const isCerrado = (l: Lead) =>
    l.status === "cerrado" ||
    l.status === "rechazado" ||
    l.qualification?.status === "venta" ||
    l.qualification?.status === "rechazado";

  const filteredLeads = timeFiltered.filter((l) => {
    if (statusSubTab === "sin_calificar") return isSinCalificar(l);
    if (statusSubTab === "en_conversacion") return isEnConversacion(l);
    if (statusSubTab === "cerrados") return isCerrado(l);
    return true;
  });

  // Contadores para las Pestañas Principales
  const countHoy = channelFiltered.filter((l) => new Date(l.created_at).getTime() >= startOfToday).length;
  const countSemana = channelFiltered.filter((l) => {
    const t = new Date(l.created_at).getTime();
    return t >= startOfWeek && t < startOfToday;
  }).length;
  const countMes = channelFiltered.filter((l) => new Date(l.created_at).getTime() >= startOfMonth).length;
  const countHistorico = channelFiltered.length;

  // Contadores para las Subpestañas del período seleccionado
  const subCountSinCalificar = timeFiltered.filter(isSinCalificar).length;
  const subCountEnConversacion = timeFiltered.filter(isEnConversacion).length;
  const subCountCerrados = timeFiltered.filter(isCerrado).length;

  function handleLeadUpdated(updated: Lead) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSelectedLead(null);
  }

  return (
    <div className="leads-container">
      {/* ── A. Selector Multicanal (Filtro Superior) ── */}
      <div className="leads-channel-bar">
        <button
          className={`leads-filter-btn ${channelFilter === "all" ? "is-active" : ""}`}
          onClick={() => setChannelFilter("all")}
        >
          Todos los Canales
        </button>
        <button
          className={`leads-filter-btn ${channelFilter === "meta_ads" ? "is-active" : ""}`}
          onClick={() => setChannelFilter("meta_ads")}
        >
          <span className="dot dot-meta" /> Meta Ads
        </button>
        <button
          className={`leads-filter-btn ${channelFilter === "google_lsa" ? "is-active" : ""}`}
          onClick={() => setChannelFilter("google_lsa")}
        >
          <span className="dot dot-lsa" /> Google LSA
        </button>
      </div>

      {/* ── B. Pestañas Temporales Principales (Hoy, Semana, Mes, Histórico) ── */}
      <div className="leads-tabs-bar">
        <button
          className={`leads-tab-item ${timeTab === "hoy" ? "is-active" : ""}`}
          onClick={() => setTimeTab("hoy")}
        >
          <span className="leads-tab-title">⚡ Hoy</span>
          {countHoy > 0 && <span className="leads-pill">{countHoy}</span>}
        </button>

        <button
          className={`leads-tab-item ${timeTab === "semana" ? "is-active" : ""}`}
          onClick={() => setTimeTab("semana")}
        >
          <span className="leads-tab-title">📅 Esta Semana</span>
          <span className="leads-pill-dim">{countSemana}</span>
        </button>

        <button
          className={`leads-tab-item ${timeTab === "mes" ? "is-active" : ""}`}
          onClick={() => setTimeTab("mes")}
        >
          <span className="leads-tab-title">📁 Este Mes</span>
          <span className="leads-pill-dim">{countMes}</span>
        </button>

        <button
          className={`leads-tab-item ${timeTab === "historico" ? "is-active" : ""}`}
          onClick={() => setTimeTab("historico")}
        >
          <span className="leads-tab-title">📁 Todo Octubre</span>
          <span className="leads-pill-dim">{countHistorico}</span>
        </button>
      </div>

      {/* ── C. Subpestañas por Estado de Trabajo ── */}
      <div className="leads-subtabs-bar">
        <button
          className={`leads-subtab-btn ${statusSubTab === "sin_calificar" ? "is-active" : ""}`}
          onClick={() => setStatusSubTab("sin_calificar")}
        >
          <span>⏳ Sin Calificar</span>
          {subCountSinCalificar > 0 && <span className="subtab-badge badge-alert">{subCountSinCalificar}</span>}
        </button>

        <button
          className={`leads-subtab-btn ${statusSubTab === "en_conversacion" ? "is-active" : ""}`}
          onClick={() => setStatusSubTab("en_conversacion")}
        >
          <span>💬 En Conversación</span>
          {subCountEnConversacion > 0 && <span className="subtab-badge badge-blue">{subCountEnConversacion}</span>}
        </button>

        <button
          className={`leads-subtab-btn ${statusSubTab === "cerrados" ? "is-active" : ""}`}
          onClick={() => setStatusSubTab("cerrados")}
        >
          <span>🏁 Cerrados (Venta / Rechazados)</span>
          {subCountCerrados > 0 && <span className="subtab-badge badge-gray">{subCountCerrados}</span>}
        </button>
      </div>

      {/* ── Lista de Tarjetas de Leads ── */}
      {filteredLeads.length === 0 ? (
        <div className="leads-empty-box">
          <p className="leads-empty-title">No hay leads en esta categoría</p>
          <p className="leads-empty-sub">
            {statusSubTab === "sin_calificar"
              ? "Todos los leads de este período ya han sido calificados."
              : statusSubTab === "en_conversacion"
              ? "No tienes negociaciones abiertas en este período."
              : "No hay leads cerrados o archivados en este período."}
          </p>
        </div>
      ) : (
        <div className="leads-grid">
          {filteredLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onOpenModal={() => setSelectedLead(lead)}
              onViewMessage={(l) => setMessageModalLead(l)}
            />
          ))}
        </div>
      )}

      {/* ── Modal Interactivo de Calificación ── */}
      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          clientId={resolvedClientId}
          onClose={() => setSelectedLead(null)}
          onSaved={handleLeadUpdated}
        />
      )}

      {/* ── Overlay Liviano para Lectura Rápida de Mensaje ── */}
      {messageModalLead && (
        <div className="lead-message-overlay" onClick={() => setMessageModalLead(null)}>
          <div className="lead-message-dialog" onClick={(e) => e.stopPropagation()}>
            <header className="lead-message-head">
              <div className="lead-message-title-box">
                <span className="lead-message-icon">💬</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: "1rem", color: "#f8fafc" }}>
                    Mensaje de {messageModalLead.contact_name || "Contacto"}
                  </h4>
                  <span className="lead-message-sub">
                    {messageModalLead.phone ? `${messageModalLead.phone} · ` : ""}
                    {messageModalLead.location?.display_name ? `📍 ${messageModalLead.location.display_name} · ` : ""}
                    {new Date(messageModalLead.created_at).toLocaleString("es-ES", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setMessageModalLead(null)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </header>
            <div className="lead-message-body">
              <blockquote className="lead-message-quote">
                "{extractLeadMessage(messageModalLead)}"
              </blockquote>
            </div>
            <footer className="lead-message-foot">
              <button
                type="button"
                className="btn-light-secondary"
                onClick={() => setMessageModalLead(null)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="btn-light-primary"
                onClick={() => {
                  const target = messageModalLead;
                  setMessageModalLead(null);
                  setSelectedLead(target);
                }}
              >
                Gestionar lead →
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tarjeta de Lead ──────────────────────────────

function LeadCard({
  lead,
  onOpenModal,
  onViewMessage,
}: {
  lead: Lead;
  onOpenModal: () => void;
  onViewMessage: (lead: Lead) => void;
}) {
  const isMeta = lead.channel === "meta_ads";
  const dateStr = new Date(lead.created_at).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const leadMessage = extractLeadMessage(lead);
  const leadType = lead.lead_type || (leadMessage ? "message" : null);

  const isClosed = lead.status === "cerrado" || lead.qualification?.status === "venta";
  const isRejected = lead.status === "rechazado" || lead.qualification?.status === "rechazado";

  const statusLabel: Record<LeadStatus, string> = {
    activo: "ACTIVO",
    en_conversacion: "EN CONVERSACIÓN",
    cerrado: "VENTA CERRADA",
    rechazado: "RECHAZADO",
  };

  const currentStatus = isClosed ? "cerrado" : isRejected ? "rechazado" : lead.status || "activo";
  const sourceInfo = getAdvertisingSourceInfo(lead.advertising_source);

  const serviceLabel = getServiceLabel(lead.qualification?.service || lead.service_type);
  const rating = lead.computed_signals?.internal_rating || lead.score;
  const saleAmount = lead.qualification?.sale_amount || lead.sale_amount;

  return (
    <article className={`lead-card status-${currentStatus}`} onClick={onOpenModal}>
      <header className="lead-card-head">
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span className={`channel-badge ${isMeta ? "badge-meta" : "badge-lsa"}`}>
            {isMeta ? "Meta Ads" : "Google LSA"}
          </span>
          {leadType === "message" ? (
            <span className="lead-type-badge is-message" title="Lead recibido por Mensaje">
              💬 Mensaje
            </span>
          ) : leadType === "phone_call" ? (
            <span className="lead-type-badge is-call" title="Lead recibido por Llamada">
              📞 Llamada
            </span>
          ) : leadType === "booking" ? (
            <span className="lead-type-badge" title="Lead recibido por Reserva">
              📅 Reserva
            </span>
          ) : null}
          {!isMeta && lead.lead_charged === true && (
            <span className="lead-charge-badge is-charged" title="Cargo confirmado por Google">
              💳 Cobrado
            </span>
          )}
          {!isMeta && lead.lead_charged === null && (lead.google_charge_resolution === "unresolved" || lead.google_lead_charged_raw === false) && (
            <span className="lead-charge-badge is-in-review" title="Google está evaluando el cargo (en revisión)">
              ⏳ Cargo en revisión
            </span>
          )}
          {sourceInfo && (
            <span className="source-origin-badge" title={sourceInfo.sublabel}>
              {sourceInfo.label}
            </span>
          )}
          {isMeta ? (
            <>
              {lead.sync?.meta_status === "pending" && (
                <span className="sync-badge sync-meta-pending pulse-amber" title="Sincronización con Meta en proceso">
                  ⏳ Meta
                </span>
              )}
              {lead.sync?.meta_status === "done" && (
                <span className="sync-badge sync-meta-done" title="Sincronizado en Meta">
                  ✓ Meta
                </span>
              )}
              {lead.sync?.meta_status === "error" && (
                <span className="sync-badge sync-error" title={lead.sync.meta_error || "Error al sincronizar con Meta"}>
                  ⚠️ Error Meta
                </span>
              )}
            </>
          ) : (
            <>
              {/* 1. Calificación */}
              {lead.sync?.api_status === "pending" && (
                <span className="sync-badge sync-pending pulse-amber" title="Calificación en proceso de sincronización con Google">
                  ⏳ Calificación
                </span>
              )}
              {lead.sync?.api_status === "done" && (
                <span className="sync-badge sync-done" title="Calificación confirmada en Google">
                  ✓ Calificación
                </span>
              )}
              {lead.sync?.api_status === "error" && (
                <span className="sync-badge sync-error" title={lead.sync.api_error || "Error en calificación"}>
                  ⚠️ Error Calificación
                </span>
              )}

              {/* 2. Cierre */}
              {lead.sync?.playwright_status === "pending" && (
                <span className="sync-badge sync-pending pulse-amber" title="Cierre en proceso de sincronización con Google">
                  ⏳ Cierre
                </span>
              )}
              {lead.sync?.playwright_status === "error" && (lead.sync?.playwright_error ?? "").startsWith("LSA action not confirmed by Google:") && (
                <span
                  className="sync-badge sync-pending pulse-amber"
                  title="El sistema ha intentado realizar el cierre o archivo, pero Google todavía no ha confirmado el estado solicitado. La comprobación automática continúa; no es necesario repetir la acción."
                >
                  ⏳ Esperando confirmación de Google
                </span>
              )}
              {lead.sync?.playwright_status === "done" && (
                <span className="sync-badge sync-done" title="Cierre confirmado en Google">
                  ✓ Cierre
                </span>
              )}
              {lead.sync?.playwright_status === "error" && !(lead.sync?.playwright_error ?? "").startsWith("LSA action not confirmed by Google:") && (
                <span className="sync-badge sync-error" title={lead.sync.playwright_error || "Error en cierre"}>
                  ⚠️ Error Cierre
                </span>
              )}

              {/* 3. Datos de reserva */}
              {lead.sync?.tracking_status === "pending" && (
                <span className="sync-badge sync-pending pulse-amber" title="Datos de reserva en proceso de sincronización con Google">
                  ⏳ Reserva
                </span>
              )}
              {lead.sync?.tracking_status === "done" && (
                <span className="sync-badge sync-done" title="Datos de reserva confirmados en Google">
                  ✓ Reserva
                </span>
              )}
              {lead.sync?.tracking_status === "error" && (
                <span className="sync-badge sync-error" title={lead.sync.tracking_error || "Error en datos de reserva"}>
                  ⚠️ Error Reserva
                </span>
              )}
            </>
          )}
        </div>

        <span className="lead-time">{dateStr}</span>
        <span className={`status-badge status-${currentStatus}`}>{statusLabel[currentStatus]}</span>
      </header>

      <div className="lead-card-body">
        <h3 className="lead-card-title">
          {lead.contact_name ? lead.contact_name : "Contacto sin nombre"}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 2, marginBottom: 4 }}>
          <span className="lead-card-phone" style={{ margin: 0 }}>{lead.phone || "Sin teléfono"}</span>
          {lead.location?.display_name && (
            <span className="lead-location-tag" title="Ubicación Google LSA">
              📍 {lead.location.display_name}
            </span>
          )}
          {leadMessage && (
            <button
              type="button"
              className="btn-view-message"
              onClick={(e) => {
                e.stopPropagation();
                onViewMessage(lead);
              }}
              title="Leer mensaje enviado por el cliente"
            >
              💬 Ver mensaje
            </button>
          )}
          <span className="lead-time" style={{ fontSize: 12 }}>🕒 {dateStr}</span>
        </div>

        {lead.lead_ext_id && (
          <span className="lead-card-id">ID: #{lead.lead_ext_id}</span>
        )}
      </div>

      <footer className="lead-card-foot">
        <div className="lead-card-tags">
          {serviceLabel && serviceLabel !== "Sin especificar" ? (
            <span className="service-tag">{serviceLabel}</span>
          ) : (
            <span className="score-tag-pending">Sin calificar</span>
          )}

          {lead.qualification?.has_storage && (
            <span className="modifier-pill">📦 Guardamuebles</span>
          )}

          {lead.qualification?.has_elevator && (
            <span className="modifier-pill">🏗️ Elevador</span>
          )}

          {lead.qualification?.is_national && (
            <span className="modifier-pill">🇪🇸 Nacional</span>
          )}

          {lead.qualification?.price_range && (
            <span className="price-pill">{getPriceRangeLabel(lead.qualification.price_range)}</span>
          )}

          {isClosed && saleAmount ? (
            <span className="sale-tag">+{saleAmount} €</span>
          ) : null}

          {rating ? (
            <span className="score-tag" title="Puntuación algorítmica">
              ★ {rating}
            </span>
          ) : null}

          {lead.computed_signals?.lsa_reason && (
            <span className="lsa-reason-tag" title="Motivo oficial Google Ads LSA">
              {lead.computed_signals.lsa_reason}
            </span>
          )}

          {lead.computed_signals?.meta_event && (
            <span className="meta-event-tag" title="Evento oficial Meta CAPI">
              ⚡ {lead.computed_signals.meta_event}
            </span>
          )}
        </div>

        <button className="btn-qualify-lead" tabIndex={-1}>
          {isClosed || isRejected ? "Ver ficha" : Boolean(lead.qualification?.service || lead.score) ? "Gestionar" : "Calificar"}{" "}
          <span className="arrow">→</span>
        </button>
      </footer>
    </article>
  );
}

// ── Modal de Calificación Interactivo (1-Tap UX / 4 Bloques) ─

function LeadModal({
  lead,
  clientId,
  onClose,
  onSaved,
}: {
  lead: Lead;
  clientId?: string;
  onClose: () => void;
  onSaved: (lead: Lead) => void;
}) {
  const alreadyQualified = Boolean(lead.qualification?.service || (lead.score && lead.service_type));
  const leadMessage = extractLeadMessage(lead);
  const leadType = lead.lead_type || (leadMessage ? "message" : null);

  const [contactName, setContactName] = useState(lead.contact_name || "");

  // Bloque A: Tipo de Requerimiento (Servicio Base - Selección Única)
  const [service, setService] = useState<QualificationServiceKey>(
    (lead.qualification?.service as QualificationServiceKey) || "mudanza_mediana"
  );

  // Bloque B: Modificadores de Valor (Toggles On / Off)
  const [hasStorage, setHasStorage] = useState<boolean>(
    Boolean(lead.qualification?.has_storage)
  );
  const [hasElevator, setHasElevator] = useState<boolean>(
    Boolean(lead.qualification?.has_elevator)
  );
  const [isNational, setIsNational] = useState<boolean>(
    Boolean(lead.qualification?.is_national)
  );

  // Bloque C: Presupuesto Estimado (Rango de Selección Rápida)
  const [priceRange, setPriceRange] = useState<PriceRangeKey | null>(
    lead.qualification?.price_range || null
  );

  // Bloque D: Estado Comercial (Acción Final)
  const initialCommercialStatus: CommercialActionStatus =
    lead.qualification?.status ||
    (lead.status === "cerrado" ? "venta" : lead.status === "rechazado" ? "rechazado" : "en_conversacion");

  const [status, setStatus] = useState<CommercialActionStatus>(
    alreadyQualified && initialCommercialStatus === "en_conversacion"
      ? "en_conversacion"
      : isDiscardService((lead.qualification?.service as QualificationServiceKey) || "mudanza_mediana")
      ? "rechazado"
      : initialCommercialStatus
  );

  const [saleAmount, setSaleAmount] = useState<string>(
    lead.qualification?.sale_amount
      ? String(lead.qualification.sale_amount)
      : lead.sale_amount
      ? String(lead.sale_amount)
      : ""
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isMeta = lead.channel === "meta_ads";
  const isMetaSaleLocked = isMeta && (lead.status === "cerrado" || lead.qualification?.status === "venta");

  const [pendingEstimateConfirm, setPendingEstimateConfirm] = useState<{
    estimate: number;
    channel: LeadChannel;
  } | null>(null);

  const modalSourceInfo = getAdvertisingSourceInfo(lead.advertising_source);
  const activeClientId = (clientId || lead.client_id || "").toLowerCase();
  const isPalma = activeClientId.includes("palma");
  const isShalom = activeClientId.includes("shalom");

  const isDiscard = isDiscardService(service);
  // Es descarte por servicio base O por incompatibilidad operativa del cliente:
  // - Elevador/Grúa: Palma sí tiene grúa propia; JG y Shalom NO tienen grúa propia (es descarte)
  // - Mudanzas Nacionales: Palma y JG sí operan nacional; Shalom solo opera local (es descarte)
  const isClientDiscard =
    isDiscard ||
    (hasElevator && !isPalma) ||
    (isNational && isShalom);

  const discardServices = QUALIFICATION_SERVICES.filter((s) => s.isDiscard);
  const movingServices = QUALIFICATION_SERVICES.filter((s) => !s.isDiscard);

  async function handleSave(confirmedWithoutAmount = false) {
    if (isMetaSaleLocked) return;
    setErrorMsg("");

    // Si es un descarte claro o incompatibilidad operativa, el estado obligatorio es Rechazado
    const finalStatus: CommercialActionStatus = isClientDiscard ? "rechazado" : status;

    let numericSale: number | undefined = undefined;
    if (finalStatus === "venta") {
      if (saleAmount && saleAmount.trim() !== "") {
        const parsedAmount = parseFloat(saleAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          setErrorMsg("El importe debe ser un número positivo en euros (€).");
          return;
        }
        numericSale = parsedAmount;
      } else {
        // Falta importe real: exigir rango de presupuesto para calcular valor de respaldo
        const estimateVal = getPriceRangeEstimate(priceRange);
        if (!priceRange || estimateVal == null) {
          setErrorMsg("Debes indicar el importe real o seleccionar un rango de presupuesto para registrar la venta.");
          return;
        }

        // Mostrar aviso dinámico de confirmación previa antes de guardar
        if (!confirmedWithoutAmount) {
          setPendingEstimateConfirm({
            estimate: estimateVal,
            channel: lead.channel,
          });
          return;
        }
      }
    }

    setPendingEstimateConfirm(null);
    setIsSaving(true);

    try {
      const res = await updateLeadAction({
        leadId: lead.id,
        clientId: clientId || lead.client_id,
        contactName: contactName.trim() || undefined,
        service,
        hasStorage,
        hasElevator,
        isNational,
        priceRange: isDiscard ? null : priceRange,
        status: finalStatus,
        saleAmount: numericSale,
      });

      if (res?.error) {
        setErrorMsg(res.error);
        setIsSaving(false);
        return;
      }

      setSavedSuccess(true);
      setTimeout(() => {
        if (res?.lead) {
          onSaved(res.lead);
        } else {
          onSaved({
            ...lead,
            contact_name: contactName.trim() || undefined,
            qualification: {
              service,
              has_storage: hasStorage,
              has_elevator: hasElevator,
              is_national: isNational,
              price_range: isDiscard ? null : priceRange,
              status,
              sale_amount: numericSale,
              qualified_at: lead.qualification?.qualified_at || new Date().toISOString(),
            },
            computed_signals: res?.computed_signals,
            sync: res?.sync,
            tracking: res?.tracking,
            status: status === "venta" ? "cerrado" : status,
            score: (res as any)?.computed_signals?.internal_rating || lead.score,
            service_type: service,
            sale_amount: numericSale,
            updated_at: new Date().toISOString(),
          });
        }
      }, 550);
    } catch (e: any) {
      setErrorMsg(e?.message || "Error al conectar con el servidor.");
      setIsSaving(false);
    }
  }

  return (
    <div className="lead-modal-backdrop" onClick={onClose}>
      {/* Toast flotante de confirmación nativa */}
      {savedSuccess && (
        <div className="pwa-toast-notification" role="status" aria-live="polite">
          <span className="pwa-toast-icon">✓</span>
          <span className="pwa-toast-text">Calificación guardada correctamente</span>
        </div>
      )}

      <div
        className={`lead-modal-box ${savedSuccess ? "modal-success-anim" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Indicador de arrastre táctil para móvil (Bottom Sheet Handle) */}
        <div className="bottom-sheet-handle" aria-hidden="true" />

        {/* Encabezado del Lead */}
        <header className="modal-lead-head">
          <div>
            <div className="modal-badges-row">
              <span className={`channel-badge ${isMeta ? "badge-meta" : "badge-lsa"}`}>
                {isMeta ? "Meta Ads" : "Google LSA"}
              </span>
              {leadType === "message" ? (
                <span className="lead-type-badge is-message" title="Lead recibido por Mensaje">
                  💬 Mensaje
                </span>
              ) : leadType === "phone_call" ? (
                <span className="lead-type-badge is-call" title="Lead recibido por Llamada">
                  📞 Llamada
                </span>
              ) : leadType === "booking" ? (
                <span className="lead-type-badge" title="Lead recibido por Reserva">
                  📅 Reserva
                </span>
              ) : null}
              {!isMeta && lead.lead_charged === true && (
                <span className="lead-charge-badge is-charged" title="Cargo confirmado por Google">
                  💳 Cobrado
                </span>
              )}
              {!isMeta && lead.lead_charged === null && (lead.google_charge_resolution === "unresolved" || lead.google_lead_charged_raw === false) && (
                <span className="lead-charge-badge is-in-review" title="Google está evaluando el cargo (en revisión)">
                  ⏳ Cargo en revisión
                </span>
              )}
              {modalSourceInfo && (
                <span className="source-origin-badge" title={modalSourceInfo.sublabel}>
                  {modalSourceInfo.label}
                </span>
              )}
              <span className={`status-badge status-${status === "venta" ? "cerrado" : status}`}>
                {status === "venta" ? "VENTA" : status.toUpperCase()}
              </span>
              {isMeta ? (
                <>
                  {lead.sync?.meta_status === "pending" && (
                    <span className="sync-badge sync-meta-pending pulse-amber" title="Sincronización con Meta en proceso">
                      ⏳ Meta
                    </span>
                  )}
                  {lead.sync?.meta_status === "done" && (
                    <span className="sync-badge sync-meta-done" title="Sincronizado en Meta">
                      ✓ Meta
                    </span>
                  )}
                  {lead.sync?.meta_status === "error" && (
                    <span className="sync-badge sync-error" title={lead.sync.meta_error || "Error al sincronizar con Meta"}>
                      ⚠️ Error Meta
                    </span>
                  )}
                </>
              ) : (
                <>
                  {/* Calificación */}
                  {lead.sync?.api_status === "pending" && (
                    <span className="sync-badge sync-pending pulse-amber" title="Calificación en proceso de sincronización con Google">
                      ⏳ Calificación
                    </span>
                  )}
                  {lead.sync?.api_status === "done" && (
                    <span className="sync-badge sync-done" title="Calificación confirmada en Google">
                      ✓ Calificación
                    </span>
                  )}
                  {lead.sync?.api_status === "error" && (
                    <span className="sync-badge sync-error" title={lead.sync.api_error || "Error en calificación"}>
                      ⚠️ Error Calificación
                    </span>
                  )}

                  {/* Cierre */}
                  {lead.sync?.playwright_status === "pending" && (
                    <span className="sync-badge sync-pending pulse-amber" title="Cierre en proceso de sincronización con Google">
                      ⏳ Cierre
                    </span>
                  )}
                  {lead.sync?.playwright_status === "error" && (lead.sync?.playwright_error ?? "").startsWith("LSA action not confirmed by Google:") && (
                    <span
                      className="sync-badge sync-pending pulse-amber"
                      title="El sistema ha intentado realizar el cierre o archivo, pero Google todavía no ha confirmado el estado solicitado. La comprobación automática continúa; no es necesario repetir la acción."
                    >
                      ⏳ Esperando confirmación de Google
                    </span>
                  )}
                  {lead.sync?.playwright_status === "done" && (
                    <span className="sync-badge sync-done" title="Cierre confirmado en Google">
                      ✓ Cierre
                    </span>
                  )}
                  {lead.sync?.playwright_status === "error" && !(lead.sync?.playwright_error ?? "").startsWith("LSA action not confirmed by Google:") && (
                    <span className="sync-badge sync-error" title={lead.sync.playwright_error || "Error en cierre"}>
                      ⚠️ Error Cierre
                    </span>
                  )}

                  {/* Datos de reserva */}
                  {lead.sync?.tracking_status === "pending" && (
                    <span className="sync-badge sync-pending pulse-amber" title="Datos de reserva en proceso de sincronización con Google">
                      ⏳ Reserva
                    </span>
                  )}
                  {lead.sync?.tracking_status === "done" && (
                    <span className="sync-badge sync-done" title="Datos de reserva confirmados en Google">
                      ✓ Reserva
                    </span>
                  )}
                  {lead.sync?.tracking_status === "error" && (
                    <span className="sync-badge sync-error" title={lead.sync.tracking_error || "Error en datos de reserva"}>
                      ⚠️ Error Reserva
                    </span>
                  )}
                </>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4, marginBottom: 2 }}>
              <span className="modal-phone" style={{ margin: 0, fontWeight: 700 }}>{lead.phone || "Sin teléfono"}</span>
              {lead.location?.display_name && (
                <span className="lead-location-tag" title="Ubicación Google LSA">
                  📍 {lead.location.display_name}
                </span>
              )}
              <span className="lead-time" style={{ fontSize: 12 }}>
                🕒 {new Date(lead.created_at).toLocaleString("es-ES", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 2 }}>
              {lead.lead_ext_id && <span className="modal-extid">ID: #{lead.lead_ext_id}</span>}
              {modalSourceInfo?.sublabel && (
                <span className="modal-origin-pill" title="Origen publicitario verificado">
                  📍 {modalSourceInfo.sublabel}
                </span>
              )}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className="modal-body-scroll">
          {/* Banners informativos de sincronización */}
          {isMeta ? (
            <>
              {lead.sync?.meta_status === "pending" && (
                <div className="modal-sync-banner is-pending">
                  <span>⏳</span>
                  <div>
                    <strong>Sincronizando con Meta:</strong> Los datos se están registrando en el administrador publicitario.
                  </div>
                </div>
              )}
              {lead.sync?.meta_status === "done" && (
                <div className="modal-sync-banner is-done">
                  <span>✓</span>
                  <div>
                    <strong>Sincronizado en Meta:</strong> Conversión registrada con éxito.
                  </div>
                </div>
              )}
              {lead.sync?.meta_status === "error" && (
                <div className="modal-sync-banner is-error">
                  <span>⚠️</span>
                  <div>
                    <strong>Error de sincronización con Meta:</strong> {lead.sync?.meta_error || "No se pudo sincronizar el evento."}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Banners LSA: Rating */}
              {lead.sync?.api_status === "pending" && (
                <div className="modal-sync-banner is-pending">
                  <span>⏳</span>
                  <div>
                    <strong>Calificación en proceso:</strong> Sincronizando la calificación con Google...
                  </div>
                </div>
              )}
              {lead.sync?.api_status === "error" && (
                <div className="modal-sync-banner is-error">
                  <span>⚠️</span>
                  <div>
                    <strong>Error en calificación:</strong> {lead.sync?.api_error || "No se pudo registrar la calificación en Google."}
                  </div>
                </div>
              )}
              {/* Banners LSA: Cierre en proceso */}
              {lead.sync?.playwright_status === "pending" && (
                <div className="modal-sync-banner is-pending">
                  <span>⏳</span>
                  <div>
                    <strong>Cierre en proceso:</strong> Procesando el {lead.sync.playwright_action === "booked" ? "cierre" : "archivo"} en Google...
                  </div>
                </div>
              )}
              {/* Banners LSA: Esperando confirmación de Google */}
              {lead.sync?.playwright_status === "error" && (lead.sync?.playwright_error ?? "").startsWith("LSA action not confirmed by Google:") && (
                <div className="modal-sync-banner is-pending">
                  <span>⏳</span>
                  <div>
                    <strong>Esperando confirmación de Google:</strong> El sistema ha intentado realizar el {lead.sync?.playwright_action === "booked" ? "cierre" : "archivo"}, pero Google todavía no ha confirmado el estado solicitado. La comprobación automática continúa; no es necesario repetir la acción.
                  </div>
                </div>
              )}
              {/* Banners LSA: Error real de Cierre */}
              {lead.sync?.playwright_status === "error" && !(lead.sync?.playwright_error ?? "").startsWith("LSA action not confirmed by Google:") && (
                <div className="modal-sync-banner is-error">
                  <span>⚠️</span>
                  <div>
                    <strong>Error en {lead.sync?.playwright_action === "booked" ? "cierre" : "archivo"}:</strong> {lead.sync?.playwright_error || "No se pudo completar la operación en Google."}
                  </div>
                </div>
              )}
              {/* Banners LSA: Tracking */}
              {lead.sync?.tracking_status === "pending" && (
                <div className="modal-sync-banner is-pending">
                  <span>⏳</span>
                  <div>
                    <strong>Actualizando datos en Google:</strong> Guardando los datos de reserva en Google...
                  </div>
                </div>
              )}
              {lead.sync?.tracking_status === "error" && (
                <div className="modal-sync-banner is-error">
                  <span>⚠️</span>
                  <div>
                    <strong>Error al actualizar datos:</strong> {lead.sync?.tracking_error || "No se pudieron actualizar los datos en Google."}
                  </div>
                </div>
              )}
              {/* Confirmación completa de cierre */}
              {lead.sync?.playwright_status === "done" && lead.sync?.tracking_status !== "pending" && (
                <div className="modal-sync-banner is-done">
                  <span>✓</span>
                  <div>
                    <strong>Cierre completado:</strong> Operación confirmada con éxito en Google.
                  </div>
                </div>
              )}
            </>
          )}

          {/* Banners Meta Ads: Cierre / Venta definitiva */}
          {isMeta && isMetaSaleLocked && (
            <div
              className={`modal-sync-banner ${
                lead.sync?.meta_status === "done"
                  ? "is-done"
                  : lead.sync?.meta_status === "error"
                  ? "is-error"
                  : "is-pending"
              }`}
            >
              <span>{lead.sync?.meta_status === "done" ? "✓" : lead.sync?.meta_status === "error" ? "⚠️" : "⏳"}</span>
              <div>
                <strong>
                  {lead.sync?.meta_status === "done"
                    ? "Venta enviada a Meta · registro definitivo"
                    : lead.sync?.meta_status === "error"
                    ? "Venta registrada y bloqueada · error de envío"
                    : "Venta registrada y bloqueada · envío a Meta pendiente"}
                </strong>
                {lead.sync?.meta_sent_at && (
                  <span style={{ display: "block", fontSize: "0.8rem", opacity: 0.8 }}>
                    Confirmado por Meta CAPI el {new Date(lead.sync.meta_sent_at).toLocaleString("es-ES")}
                  </span>
                )}
                {lead.sync?.meta_error && (
                  <span style={{ display: "block", fontSize: "0.8rem", color: "#f87171" }}>
                    Detalle: {lead.sync.meta_error}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Mensaje enviado por el cliente */}
          {leadMessage && (
            <div className="modal-lead-message-box">
              <div className="modal-lead-message-head">
                <span className="modal-lead-message-icon">💬</span>
                <span className="modal-lead-message-title">Mensaje enviado por el cliente</span>
              </div>
              <p className="modal-lead-message-text">"{leadMessage}"</p>
            </div>
          )}

          {/* Nombre del cliente (opcional) */}
          <div className="modal-section">
            <label className="modal-label">
              <span>Nombre del Cliente (opcional)</span>
              <input
                type="text"
                disabled={isSaving || isMetaSaleLocked}
                className="modal-text-input"
                placeholder="Ej.: Juan Pérez"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </label>
          </div>

          {/* ── BLOQUE A: Tipo de Requerimiento (Servicio Base - Selección Única) ── */}
          <div className={`modal-section ${alreadyQualified || isMetaSaleLocked ? "is-locked" : ""}`}>
            <span className="modal-label-span">
              A. Tipo de Requerimiento{" "}
              {isMetaSaleLocked ? (
                <span className="locked-note">· Bloqueado por venta definitiva</span>
              ) : alreadyQualified ? (
                <span className="locked-note">· Calificación fija</span>
              ) : null}
            </span>

            {/* Descartes Claros */}
            <div className="services-subhead">🚫 Descartes Claros</div>
            <div className="services-grid-discards">
              {discardServices.map((srv) => (
                <button
                  key={srv.key}
                  type="button"
                  disabled={alreadyQualified || isMetaSaleLocked}
                  className={`btn-service btn-service-discard ${
                    service === srv.key ? "is-selected" : ""
                  } ${alreadyQualified || isMetaSaleLocked ? "btn-disabled" : ""}`}
                  onClick={() => {
                    if (!alreadyQualified && !isMetaSaleLocked) {
                      setService(srv.key);
                      setPriceRange(null); // Descarte oculta y vacía el presupuesto
                      setStatus("rechazado"); // Obligatoriamente rechazado
                    }
                  }}
                  title={srv.description}
                >
                  <span>{srv.icon}</span>
                  <span>{srv.label}</span>
                </button>
              ))}
            </div>

            {/* Servicios de Mudanza */}
            <div className="services-subhead" style={{ marginTop: 10 }}>
              🚚 Mudanzas
            </div>
            <div className="services-grid-moving">
              {movingServices.map((srv) => (
                <button
                  key={srv.key}
                  type="button"
                  disabled={alreadyQualified || isMetaSaleLocked}
                  className={`btn-service ${service === srv.key ? "is-selected" : ""} ${
                    alreadyQualified || isMetaSaleLocked ? "btn-disabled" : ""
                  }`}
                  onClick={() => {
                    if (!alreadyQualified && !isMetaSaleLocked) {
                      setService(srv.key);
                      if (status === "rechazado" && isDiscard) {
                        setStatus("en_conversacion");
                      }
                    }
                  }}
                  title={srv.description}
                >
                  <span>{srv.icon}</span>
                  <span>{srv.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── BLOQUE B: Modificadores de Valor (Toggles On / Off) ── */}
          <div className={`modal-section ${alreadyQualified || isMetaSaleLocked ? "is-locked" : ""}`}>
            <span className="modal-label-span">
              B. Modificadores de Valor{" "}
              {isMetaSaleLocked ? (
                <span className="locked-note">· Bloqueado por venta definitiva</span>
              ) : alreadyQualified ? (
                <span className="locked-note">· Bloqueado</span>
              ) : null}
            </span>

            <div className="toggles-grid">
              <button
                type="button"
                disabled={alreadyQualified || isMetaSaleLocked}
                className={`btn-toggle ${hasStorage ? "is-active" : ""} ${
                  alreadyQualified || isMetaSaleLocked ? "btn-disabled" : ""
                }`}
                onClick={() => !alreadyQualified && !isMetaSaleLocked && setHasStorage(!hasStorage)}
              >
                <span>📦 + Incluye Guardamuebles</span>
                <span className="toggle-indicator">{hasStorage ? "✓" : ""}</span>
              </button>

              <button
                type="button"
                disabled={alreadyQualified || isMetaSaleLocked}
                className={`btn-toggle btn-toggle-elevator ${hasElevator ? "is-active" : ""} ${
                  alreadyQualified || isMetaSaleLocked ? "btn-disabled" : ""
                }`}
                onClick={() => {
                  if (!alreadyQualified && !isMetaSaleLocked) {
                    const nextVal = !hasElevator;
                    setHasElevator(nextVal);
                    if (nextVal && !isPalma) {
                      setStatus("rechazado");
                    }
                  }
                }}
              >
                <span>🏗️ + Requiere Elevador / Grúa</span>
                <span className="toggle-indicator">{hasElevator ? "✓" : ""}</span>
              </button>

              <button
                type="button"
                disabled={alreadyQualified || isMetaSaleLocked}
                className={`btn-toggle btn-toggle-national ${isNational ? "is-active" : ""} ${
                  alreadyQualified || isMetaSaleLocked ? "btn-disabled" : ""
                }`}
                onClick={() => {
                  if (!alreadyQualified && !isMetaSaleLocked) {
                    const nextVal = !isNational;
                    setIsNational(nextVal);
                    if (nextVal && isShalom) {
                      setStatus("rechazado");
                    }
                  }
                }}
              >
                <span>🇪🇸 + Mudanza Nacional</span>
                <span className="toggle-indicator">{isNational ? "✓" : ""}</span>
              </button>
            </div>
          </div>

          {/* ── BLOQUE C: Presupuesto Estimado (Rango de Selección Rápida) ── */}
          {/* Se oculta automáticamente si se seleccionó un descarte como Spam, Fuera de Zona o Incompatibilidad de Flota */}
          {!isClientDiscard && (
            <div className={`modal-section ${alreadyQualified || isMetaSaleLocked ? "is-locked" : ""}`}>
              <span className="modal-label-span">
                C. Presupuesto Estimado{" "}
                {isMetaSaleLocked ? (
                  <span className="locked-note">· Bloqueado por venta definitiva</span>
                ) : alreadyQualified ? (
                  <span className="locked-note">· Bloqueado</span>
                ) : null}
              </span>

              <div className="price-ranges-grid">
                {PRICE_RANGES.map((pr) => (
                  <button
                    key={pr.key}
                    type="button"
                    disabled={alreadyQualified || isMetaSaleLocked}
                    className={`btn-price-range ${
                      normalizePriceRange(priceRange) === pr.key ? "is-selected" : ""
                    } ${alreadyQualified || isMetaSaleLocked ? "btn-disabled" : ""}`}
                    onClick={() => !alreadyQualified && !isMetaSaleLocked && setPriceRange(pr.key)}
                  >
                    {pr.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── BLOQUE D: Estado Comercial (Acción Final) ── */}
          <div className="modal-section">
            <span className="modal-label-span">
              D. Estado Comercial{" "}
              {isMetaSaleLocked ? (
                <span className="locked-note">· Venta definitiva en Meta (registro inmutable)</span>
              ) : isClientDiscard ? (
                <span className="locked-note">· Fijado en Rechazo por descarte / incompatibilidad operativa</span>
              ) : alreadyQualified ? (
                <span className="locked-note">· Selecciona Venta o Rechazo para resolver</span>
              ) : null}
            </span>

            <div className="actions-buttons-grid">
              <button
                type="button"
                disabled={alreadyQualified || isClientDiscard || isMetaSaleLocked}
                className={`btn-action btn-action-conv ${
                  status === "en_conversacion" && !isClientDiscard ? "is-selected" : ""
                } ${alreadyQualified || isClientDiscard || isMetaSaleLocked ? "btn-disabled" : ""}`}
                onClick={() => !alreadyQualified && !isClientDiscard && !isMetaSaleLocked && setStatus("en_conversacion")}
                title={
                  isMetaSaleLocked
                    ? "Venta definitiva ya cerrada en Meta Ads"
                    : isClientDiscard
                    ? "No disponible: lead incompatible con la operativa del cliente"
                    : alreadyQualified
                    ? "El lead ya fue calificado y está en conversación"
                    : undefined
                }
              >
                💬 En Conversación
              </button>

              <button
                type="button"
                disabled={isMetaSaleLocked}
                className={`btn-action btn-action-reject ${
                  status === "rechazado" || isClientDiscard ? "is-selected" : ""
                } ${isMetaSaleLocked ? "btn-disabled" : ""}`}
                onClick={() => !isMetaSaleLocked && setStatus("rechazado")}
                title={isMetaSaleLocked ? "Venta definitiva ya cerrada en Meta Ads" : undefined}
              >
                ❌ Rechazado
              </button>

              <button
                type="button"
                disabled={isClientDiscard || isMetaSaleLocked}
                className={`btn-action btn-action-sale ${
                  status === "venta" && !isClientDiscard ? "is-selected" : ""
                } ${isClientDiscard || isMetaSaleLocked ? "btn-disabled" : ""}`}
                onClick={() => !isClientDiscard && !isMetaSaleLocked && setStatus("venta")}
                title={
                  isMetaSaleLocked
                    ? "Venta definitiva ya cerrada en Meta Ads"
                    : isClientDiscard
                    ? "No disponible para descartes"
                    : undefined
                }
              >
                🎉 Venta Cerrada
              </button>
            </div>

            {/* Despliegue dinámico de importe real si es Venta */}
            {status === "venta" && (
              <div className="sale-amount-box">
                <label className="modal-label">
                  <span>Importe Real (€) cerrado {isMetaSaleLocked ? "(definitivo)" : "(opcional si hay presupuesto)"}</span>
                  <div className="input-currency-wrap">
                    <input
                      type="number"
                      step="any"
                      min="1"
                      disabled={isSaving || isMetaSaleLocked}
                      autoFocus={!isMetaSaleLocked}
                      className="modal-text-input input-currency"
                      placeholder="Ej.: 850"
                      value={saleAmount}
                      onChange={(e) => setSaleAmount(e.target.value)}
                    />
                    <span className="currency-symbol">€</span>
                  </div>
                </label>
              </div>
            )}
          </div>

          {errorMsg && <p className="modal-error">{errorMsg}</p>}
        </div>

        {/* Footer Guardar / Bloqueo Meta / Confirmación Estimada */}
        <footer className="modal-footer">
          {isMetaSaleLocked ? (
            <div
              className="modal-locked-footer-msg"
              style={{
                width: "100%",
                textAlign: "center",
                padding: "12px",
                borderRadius: 0,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--text-muted, #94a3b8)",
                fontSize: "0.9rem",
                fontWeight: 500,
              }}
            >
              🔒{" "}
              {lead.sync?.meta_status === "done"
                ? "Venta enviada a Meta · registro definitivo"
                : lead.sync?.meta_status === "error"
                ? "Venta registrada y bloqueada · error de envío"
                : "Venta registrada y bloqueada · envío a Meta pendiente"}
            </div>
          ) : pendingEstimateConfirm ? (
            <div
              className="estimate-confirm-card"
              style={{
                width: "100%",
                background: "#fffbeb",
                border: "1px solid #fcd34d",
                borderRadius: 0,
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.92rem", lineHeight: 1.5 }}>
                <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>⚠️</span>
                <div>
                  <strong style={{ color: "#b45309", fontSize: "0.95rem", display: "block", marginBottom: "4px" }}>
                    Aviso de venta sin importe real:
                  </strong>
                  <p style={{ margin: 0, color: "#334155", fontSize: "0.88rem", lineHeight: 1.5, fontWeight: 500 }}>
                    {pendingEstimateConfirm.channel === "meta_ads"
                      ? `No has indicado el importe real: se utilizará el valor mínimo del rango seleccionado (${pendingEstimateConfirm.estimate} €) para enviar a Meta. Una vez confirmada, esta venta no podrá editarse.`
                      : `No has indicado el importe real: se utilizará el valor mínimo del rango seleccionado (${pendingEstimateConfirm.estimate} €) para enviar a Google LSA. Podrás editar el importe final posteriormente si lo deseas.`}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap", marginTop: "4px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isSaving}
                  onClick={() => setPendingEstimateConfirm(null)}
                  style={{
                    padding: "8px 14px",
                    fontSize: "0.85rem",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#334155",
                    borderRadius: 0,
                    fontWeight: 500,
                  }}
                >
                  Volver e indicar importe
                </button>
                <button
                  type="button"
                  className="btn btn-accent"
                  disabled={isSaving}
                  onClick={() => handleSave(true)}
                  style={{
                    padding: "8px 16px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    borderRadius: 0,
                  }}
                >
                  {isSaving ? "Guardando…" : `Confirmar venta con ${pendingEstimateConfirm.estimate} €`}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-accent modal-save-btn"
              disabled={isSaving}
              onClick={() => handleSave(false)}
            >
              {isSaving
                ? "Guardando y sincronizando…"
                : savedSuccess
                ? "✓ ¡Guardado en Cola!"
                : status === "venta"
                ? "Confirmar Venta Cerrada"
                : status === "rechazado"
                ? "Marcar Rechazo / Disputa"
                : "Guardar en Conversación"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
