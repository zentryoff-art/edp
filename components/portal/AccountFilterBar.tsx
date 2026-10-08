"use client";

import type { AccountOption } from "@/lib/portal/accounts";

interface AccountFilterBarProps {
  options: AccountOption[];
  selectedIds: string[]; // vacío [] significa "todas las cuentas activas"
  onChange: (ids: string[]) => void;
  label?: string;
}

export function AccountFilterBar({
  options,
  selectedIds,
  onChange,
  label = "Cuenta / Ciudad:",
}: AccountFilterBarProps) {
  if (!options || options.length <= 1) {
    return null; // No mostrar filtro redundante si el cliente solo tiene 1 cuenta
  }

  const isAllSelected = selectedIds.length === 0 || selectedIds.length === options.length;

  function toggleOption(id: string) {
    if (isAllSelected) {
      // Si estaban todas seleccionadas, aislar la pulsada
      onChange([id]);
      return;
    }

    if (selectedIds.includes(id)) {
      const next = selectedIds.filter((item) => item !== id);
      // Si se deseleccionan todas, volver al estado "todas"
      onChange(next.length === 0 ? [] : next);
    } else {
      const next = [...selectedIds, id];
      // Si se seleccionan todas individualmente, normalizar a [] ("todas")
      onChange(next.length === options.length ? [] : next);
    }
  }

  function handleSelectAll() {
    onChange([]);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
        borderTop: "1px dashed var(--line, #e3dfd7)",
        paddingTop: "10px",
      }}
    >
      <span
        style={{
          fontSize: "12px",
          color: "var(--muted)",
          textTransform: "uppercase",
          fontWeight: 700,
          minWidth: "65px",
        }}
      >
        {label}
      </span>

      <div className="pc-date-presets" style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        <button
          type="button"
          className={`pc-date-pill ${isAllSelected ? "is-active" : ""}`}
          onClick={handleSelectAll}
          title="Ver métricas y leads de todas las cuentas simultáneamente"
        >
          🌐 Todas las cuentas {isAllSelected && `(${options.length})`}
        </button>

        {options.map((opt) => {
          const isSelected = isAllSelected || selectedIds.includes(opt.id);
          const isIndividuallyActive = !isAllSelected && selectedIds.includes(opt.id);

          return (
            <button
              key={opt.id}
              type="button"
              className={`pc-date-pill ${isIndividuallyActive ? "is-active" : ""}`}
              onClick={() => toggleOption(opt.id)}
              title={`${opt.label} (${opt.channel === "google_lsa" ? "Google LSA" : "Meta Ads"}) - Click para alternar`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span>{opt.city ? `📍 ${opt.shortLabel}` : opt.shortLabel}</span>
              {/* Indicador visual de checkbox o estado activo cuando hay selección múltiple parcial */}
              {!isAllSelected && (
                <span
                  style={{
                    fontSize: "10px",
                    opacity: isSelected ? 1 : 0.4,
                    marginLeft: "2px",
                  }}
                >
                  {isSelected ? "✓" : "+"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
