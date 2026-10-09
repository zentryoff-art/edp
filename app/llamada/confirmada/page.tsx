import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Scale } from "@/components/Scale";
import { Logo } from "@/components/Logo";
import { ConfirmadaContent } from "./ConfirmadaContent";

export const metadata: Metadata = {
  title: "Llamada confirmada · Estudio Digital Pro",
  description: "Tu llamada de diagnóstico ha sido reservada con éxito.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LlamadaConfirmadaPage() {
  return (
    <>
      <header className="site-header" style={{ position: "relative" }}>
        <div className="wrap header-bar">
          <Link href="/" className="header-logo" aria-label="Estudio Digital Pro, inicio">
            <Logo size={16} />
          </Link>
          <div className="header-actions">
            <Link href="/" className="btn btn-outline btn-sm">
              Volver a la web
            </Link>
          </div>
        </div>
      </header>

      <main style={{ minHeight: "75vh", display: "flex", alignItems: "center", padding: "64px 0" }}>
        <div className="wrap" style={{ maxWidth: "760px" }}>
          <Suspense fallback={
            <div style={{ padding: "48px", border: "1px solid var(--line, #e2dfd9)", background: "var(--card-bg, #fff)" }}>
              <Scale score={5} size={20} gap={4} label="" />
              <p className="eyebrow" style={{ marginTop: "16px" }}>Cargando confirmación…</p>
            </div>
          }>
            <ConfirmadaContent />
          </Suspense>
        </div>
      </main>
    </>
  );
}
