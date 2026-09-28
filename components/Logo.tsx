import { Scale } from "./Scale";

export function Logo({ size = 16, descriptor = false }: { size?: number; descriptor?: boolean }) {
  const mod = Math.round(size * 0.38);
  return (
    <span className="logo" style={{ gap: Math.round(size * 0.55) }}>
      <Scale score={5} size={mod} gap={Math.max(2, Math.round(mod / 3))} label="Estudio Digital Pro" />
      <span className="logo-text">
        <span className="logo-name" style={{ fontSize: size }}>
          Estudio Digital Pro
        </span>
        {descriptor && <span className="logo-desc">Captación de clientes con IA</span>}
      </span>
    </span>
  );
}
