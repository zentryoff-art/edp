"use client";

import { useState } from "react";
import type { Lead, LeadChannel, LeadService, LeadStatus } from "@/lib/portal/types";
import { updateLeadAction } from "@/app/clientes/actions";

const SERVICES: LeadService[] = [
  "Spam / Empleo",
  "Porte",
  "Furgoneta",
  "Mudanza Chica",
  "Mudanza Mediana",
  "Mudanza Grande",
  "Mudanza + Guardamueble",
  "Elevación",
];

export function LeadsView({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [channelFilter, setChannelFilter] = useState<"all" | LeadChannel>("all");
  const [timeTab, setTimeTab] = useState<"hoy" | "semana" | "mes">("hoy");
  const [statusSubTab, setStatusSubTab] = useState<"sin_calificar" | "en_conversacion" | "cerrados">("sin_calificar");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

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

  // 2. Filtrado por Pestaña Temporal Principal (Hoy, Esta Semana, Este Mes)
  const timeFiltered = channelFiltered.filter((l) => {
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
  // - sin_calificar: status 'activo' y sin puntuación asignada
  // - en_conversacion: status 'en_conversacion' o con puntuación pero sin cerrar/rechazar
  // - cerrados: status 'cerrado' (venta) o 'rechazado' (descartado/archivado)
  const isSinCalificar = (l: Lead) => l.status === "activo" && !l.score;
  const isEnConversacion = (l: Lead) => l.status === "en_conversacion" || (l.status === "activo" && Boolean(l.score));
  const isCerrado = (l: Lead) => l.status === "cerrado" || l.status === "rechazado";

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

      {/* ── B. Pestañas Temporales Principales (Hoy, Semana, Mes) ── */}
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
            <LeadCard key={lead.id} lead={lead} onOpenModal={() => setSelectedLead(lead)} />
          ))}
        </div>
      )}

      {/* ── Modal Interactivo de Calificación ── */}
      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onSaved={handleLeadUpdated}
        />
      )}
    </div>
  );
}

// ── Tarjeta de Lead ──────────────────────────────

function LeadCard({ lead, onOpenModal }: { lead: Lead; onOpenModal: () => void }) {
  const isMeta = lead.channel === "meta_ads";
  const dateStr = new Date(lead.created_at).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusLabel: Record<LeadStatus, string> = {
    activo: "ACTIVO",
    en_conversacion: "EN CONVERSACIÓN",
    cerrado: "CERRADO",
    rechazado: "RECHAZADO",
  };

  return (
    <article className={`lead-card status-${lead.status}`} onClick={onOpenModal}>
      <header className="lead-card-head">
        <span className={`channel-badge ${isMeta ? "badge-meta" : "badge-lsa"}`}>
          {isMeta ? "Meta Ads" : "Google LSA"}
        </span>
        <span className="lead-time">{dateStr}</span>
        <span className={`status-badge status-${lead.status}`}>{statusLabel[lead.status]}</span>
      </header>

      <div className="lead-card-body">
        <h3 className="lead-card-title">
          {lead.contact_name ? lead.contact_name : "Contacto sin nombre"}
        </h3>
        <p className="lead-card-phone">{lead.phone || "Sin teléfono"}</p>

        {lead.lead_ext_id && (
          <span className="lead-card-id">ID: #{lead.lead_ext_id}</span>
        )}
      </div>

      <footer className="lead-card-foot">
        <div className="lead-card-tags">
          {lead.score ? (
            <span className="score-tag">
              ★ {lead.score}/5
            </span>
          ) : (
            <span className="score-tag-pending">Sin calificar</span>
          )}

          {lead.service_type && (
            <span className="service-tag">{lead.service_type}</span>
          )}

          {lead.status === "cerrado" && lead.sale_amount && (
            <span className="sale-tag">+{lead.sale_amount} €</span>
          )}
        </div>

        <button className="btn-qualify-lead" tabIndex={-1}>
          {lead.status === "cerrado" || lead.status === "rechazado"
            ? "Ver ficha"
            : Boolean(lead.score)
            ? "Gestionar"
            : "Calificar"}{" "}
          <span className="arrow">→</span>
        </button>
      </footer>
    </article>
  );
}

// ── Modal de Calificación Interactivo (1-Tap UX) ─

function LeadModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: Lead;
  onClose: () => void;
  onSaved: (lead: Lead) => void;
}) {
  const alreadyQualified = Boolean(lead.score);
  const [contactName, setContactName] = useState(lead.contact_name || "");
  const [score, setScore] = useState<number | undefined>(lead.score);
  const [serviceType, setServiceType] = useState<LeadService | undefined>(lead.service_type);
  const [status, setStatus] = useState<LeadStatus>(
    // Si ya está calificado y sigue en conversación, por defecto puede marcar venta o rechazo
    lead.status === "activo" && alreadyQualified ? "en_conversacion" : lead.status
  );
  const [saleAmount, setSaleAmount] = useState<string>(
    lead.sale_amount ? String(lead.sale_amount) : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isMeta = lead.channel === "meta_ads";

  async function handleSave() {
    if (!alreadyQualified && !score) {
      setErrorMsg("Selecciona una puntuación del 1 al 5 antes de guardar.");
      return;
    }

    setIsSaving(true);
    setErrorMsg("");

    const numericSale = status === "cerrado" ? (parseFloat(saleAmount) || 0) : undefined;

    try {
      const res = await updateLeadAction({
        leadId: lead.id,
        contactName: contactName.trim() || undefined,
        score: alreadyQualified ? lead.score : score,
        serviceType: alreadyQualified ? lead.service_type : serviceType,
        status,
        saleAmount: numericSale,
      });

      if (res?.error) {
        setErrorMsg(res.error);
        setIsSaving(false);
        return;
      }

      setSavedSuccess(true);
      setTimeout(() => {
        onSaved({
          ...lead,
          contact_name: contactName.trim() || undefined,
          score: alreadyQualified ? lead.score : score,
          service_type: alreadyQualified ? lead.service_type : serviceType,
          status,
          sale_amount: numericSale,
          updated_at: new Date().toISOString(),
        });
      }, 350);
    } catch (e: any) {
      setErrorMsg(e?.message || "Error al conectar con el servidor.");
      setIsSaving(false);
    }
  }

  return (
    <div className="lead-modal-backdrop" onClick={onClose}>
      <div
        className={`lead-modal-box ${savedSuccess ? "modal-success-anim" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado del Lead */}
        <header className="modal-lead-head">
          <div>
            <div className="modal-badges-row">
              <span className={`channel-badge ${isMeta ? "badge-meta" : "badge-lsa"}`}>
                {isMeta ? "Meta Ads" : "Google LSA"}
              </span>
              <span className={`status-badge status-${status}`}>
                {status.toUpperCase()}
              </span>
            </div>
            <p className="modal-phone">{lead.phone || "Sin teléfono"}</p>
            {lead.lead_ext_id && <span className="modal-extid">ID: #{lead.lead_ext_id}</span>}
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className="modal-body-scroll">
          {/* 1. Nombre del cliente (opcional) */}
          <div className="modal-section">
            <label className="modal-label">
              <span>Nombre del Cliente (opcional)</span>
              <input
                type="text"
                className="modal-text-input"
                placeholder="Ej.: Juan Pérez"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </label>
          </div>

          {/* 2. Puntuación de Calidad (1 al 5) - Bloqueada si ya está calificado */}
          <div className={`modal-section ${alreadyQualified ? "is-locked" : ""}`}>
            <span className="modal-label-span">
              Puntuación de Calidad (1 al 5){" "}
              {alreadyQualified && <span className="locked-note">· Calificación fija</span>}
            </span>
            <div className="score-buttons-grid">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={alreadyQualified}
                  className={`btn-score ${score === num ? "is-selected" : ""} ${
                    alreadyQualified ? "btn-disabled" : ""
                  }`}
                  onClick={() => !alreadyQualified && setScore(num)}
                >
                  <span className="score-num">{num}</span>
                  <span className="score-star">★</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Tipo de Servicio - Bloqueado si ya está calificado */}
          <div className={`modal-section ${alreadyQualified ? "is-locked" : ""}`}>
            <span className="modal-label-span">
              Tipo de Servicio {alreadyQualified && <span className="locked-note">· Fijo</span>}
            </span>
            <div className="services-grid">
              {SERVICES.map((srv) => (
                <button
                  key={srv}
                  type="button"
                  disabled={alreadyQualified}
                  className={`btn-service ${serviceType === srv ? "is-selected" : ""} ${
                    alreadyQualified ? "btn-disabled" : ""
                  }`}
                  onClick={() => !alreadyQualified && setServiceType(srv)}
                >
                  {srv}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Estado de la Venta / Acción Comercial - Solo Rechazar o Venta si ya calificado */}
          <div className="modal-section">
            <span className="modal-label-span">
              Acción Comercial{" "}
              {alreadyQualified && (
                <span className="locked-note">· Selecciona Venta o Rechazo para cerrar</span>
              )}
            </span>
            <div className="actions-buttons-grid">
              <button
                type="button"
                disabled={alreadyQualified}
                className={`btn-action btn-action-conv ${
                  status === "en_conversacion" ? "is-selected" : ""
                } ${alreadyQualified ? "btn-disabled" : ""}`}
                onClick={() => !alreadyQualified && setStatus("en_conversacion")}
                title={alreadyQualified ? "Ya calificado en conversación" : undefined}
              >
                💬 En Conversación
              </button>

              <button
                type="button"
                className={`btn-action btn-action-reject ${
                  status === "rechazado" ? "is-selected" : ""
                }`}
                onClick={() => setStatus("rechazado")}
              >
                ❌ Rechazado
              </button>

              <button
                type="button"
                className={`btn-action btn-action-sale ${
                  status === "cerrado" ? "is-selected" : ""
                }`}
                onClick={() => setStatus("cerrado")}
              >
                🎉 Venta
              </button>
            </div>

            {/* Despliegue dinámico de monto si es Venta */}
            {status === "cerrado" && (
              <div className="sale-amount-box">
                <label className="modal-label">
                  <span>Monto del trabajo cerrado (€)</span>
                  <div className="input-currency-wrap">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      autoFocus
                      className="modal-text-input input-currency"
                      placeholder="Ej.: 450"
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

        {/* Footer Guardar */}
        <footer className="modal-footer">
          <button
            type="button"
            className="btn btn-accent modal-save-btn"
            disabled={isSaving}
            onClick={handleSave}
          >
            {isSaving
              ? "Guardando…"
              : savedSuccess
              ? "✓ ¡Guardado!"
              : alreadyQualified
              ? status === "cerrado"
                ? "Registrar Venta"
                : status === "rechazado"
                ? "Marcar Rechazado"
                : "Actualizar Estado"
              : "Guardar Calificación"}
          </button>
        </footer>
      </div>
    </div>
  );
}
