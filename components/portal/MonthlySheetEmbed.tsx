"use client";

import { useState, useEffect, useCallback } from "react";
import { getMonthlySheetAction, syncMonthSheetAction } from "@/app/clientes/actions";

interface MonthlySheetEmbedProps {
  period: string; // YYYY-MM
  periodLabel: string;
  initialSheet?: {
    spreadsheetId: string;
    spreadsheetUrl: string;
    embedUrl: string;
    updatedAt?: string;
  } | null;
}

export function MonthlySheetEmbed({
  period,
  periodLabel,
  initialSheet,
}: MonthlySheetEmbedProps) {
  const [sheet, setSheet] = useState(initialSheet || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleLoadOrCreate = useCallback(async () => {
    setIsLoading(true);
    setSyncMsg(null);
    try {
      const res = await getMonthlySheetAction(period);
      if (res.ok && res.sheet) {
        setSheet(res.sheet);
      } else {
        setSyncMsg({ ok: false, text: res.error || "No se pudo cargar la hoja de cálculo." });
      }
    } catch (err: any) {
      setSyncMsg({ ok: false, text: err.message || "Error de conexión." });
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (!sheet) {
      handleLoadOrCreate();
    }
  }, [sheet, handleLoadOrCreate]);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncMsg(null);
    try {
      const res = await syncMonthSheetAction(period);
      if (res.ok) {
        setSyncMsg({
          ok: true,
          text: `Sincronizados ${res.count} leads en el Google Sheet correctamente.`,
        });
        if ("spreadsheetUrl" in res && res.spreadsheetUrl && sheet) {
          setSheet({
            ...sheet,
            spreadsheetUrl: res.spreadsheetUrl,
          });
        }
      } else {
        setSyncMsg({ ok: false, text: res.error || "Error al sincronizar." });
      }
    } catch (err: any) {
      setSyncMsg({ ok: false, text: err.message || "Error al conectar." });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      style={{
        background: "var(--card-bg, #ffffff)",
        border: "1px solid var(--line, #e2e8f0)",
        borderRadius: "0px",
        padding: "20px",
        marginTop: "20px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "1.2rem" }}>📊</span>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
              Google Sheet de Leads · {periodLabel}
            </h3>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                background: "#e8f5e9",
                color: "#2e7d32",
                padding: "2px 8px",
                borderRadius: "3px",
              }}
            >
              En vivo
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--muted, #64748b)" }}>
            Hojas independientes por canal (<strong>Google LSA</strong> y <strong>Meta Ads</strong>). Actualizado en tiempo real con cada lead, calificación, cierre e importe.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {sheet?.spreadsheetUrl && (
            <a
              href={sheet.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{
                fontSize: "12px",
                padding: "6px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                textDecoration: "none",
              }}
            >
              <span>Abrir en Google Sheets</span>
              <span>↗</span>
            </a>
          )}

          <button
            type="button"
            onClick={sheet ? handleSyncAll : handleLoadOrCreate}
            disabled={isLoading || isSyncing}
            className="btn btn-ink"
            style={{
              fontSize: "12px",
              padding: "6px 14px",
              cursor: isLoading || isSyncing ? "wait" : "pointer",
            }}
          >
            {isSyncing
              ? "⏳ Sincronizando..."
              : isLoading
              ? "⏳ Generando..."
              : sheet
              ? "🔄 Sincronizar Leads"
              : "📊 Cargar / Crear Google Sheet"}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div
          style={{
            padding: "8px 12px",
            fontSize: "12px",
            marginBottom: "12px",
            background: syncMsg.ok ? "#edf7f0" : "#fef2f2",
            border: `1px solid ${syncMsg.ok ? "#c3e6cb" : "#fecaca"}`,
            color: syncMsg.ok ? "var(--good, #1f6b43)" : "#991b1b",
          }}
        >
          {syncMsg.ok ? "✅ " : "⚠️ "}
          {syncMsg.text}
        </div>
      )}

      {sheet?.embedUrl ? (
        <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
          <iframe
            src={sheet.embedUrl}
            title={`Google Sheet Leads ${periodLabel}`}
            style={{
              width: "100%",
              height: "480px",
              border: "1px solid var(--line, #e2e8f0)",
              borderRadius: "0px",
              background: "#ffffff",
            }}
          />
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "11px",
              color: "var(--muted, #64748b)",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <span>
              💡 <em>Vista interactiva incrustada. Puedes cambiar de pestaña (Google LSA / Meta Ads) en la barra inferior.</em>
            </span>
            <span>
              ✏️ <em>Para editar o añadir notas directamente, pulsa <strong>Abrir en Google Sheets ↗</strong></em>
            </span>
          </div>
        </div>
      ) : (
        <div
          style={{
            border: "1px dashed var(--line, #cbd5e1)",
            padding: "36px 20px",
            textAlign: "center",
            background: "var(--paper, #f8fafc)",
          }}
        >
          <p style={{ margin: "0 0 12px", fontSize: "13px", color: "var(--muted, #64748b)" }}>
            La hoja de cálculo de Google Sheets para <strong>{periodLabel}</strong> aún no se ha generado o está lista para sincronizarse.
          </p>
          <button
            type="button"
            onClick={handleLoadOrCreate}
            disabled={isLoading}
            className="btn btn-ink"
            style={{ fontSize: "13px", padding: "8px 16px" }}
          >
            {isLoading ? "⏳ Creando Google Sheet mensual..." : "📊 Generar e Incrustar Google Sheet del Mes"}
          </button>
        </div>
      )}
    </div>
  );
}
