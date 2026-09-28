"use client";

export function PrintButton() {
  return (
    <button type="button" className="btn btn-ink" onClick={() => window.print()}>
      Imprimir / guardar PDF
    </button>
  );
}
