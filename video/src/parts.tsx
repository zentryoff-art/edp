import React, { useEffect, useState } from "react";
import { continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { C, FONTS_URL, display, mono, sans } from "./theme";

/** Carga las fuentes de marca antes de renderizar ningún fotograma. */
export const Fonts: React.FC = () => {
  const [handle] = useState(() => delayRender("Cargando fuentes"));
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_URL;
    link.onload = () => {
      Promise.all([
        document.fonts.load("750 100px Archivo"),
        document.fonts.load("600 100px Archivo"),
        document.fonts.load("400 100px 'Source Serif 4'"),
        document.fonts.load("400 100px 'IBM Plex Mono'"),
      ]).then(() => continueRender(handle));
    };
    link.onerror = () => continueRender(handle);
    document.head.appendChild(link);
  }, [handle]);
  return null;
};

export const ease = Easing.bezier(0.2, 0.7, 0.1, 1);

/** 0→1 con la curva de la marca entre dos fotogramas. */
export function useT(from: number, dur: number) {
  const f = useCurrentFrame();
  return interpolate(f, [from, from + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
}

export function useSpring(delay: number, damping = 18) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - delay, fps, config: { damping, mass: 0.7, stiffness: 140 } });
}

/** Fundido de salida de escena. */
export const SceneFade: React.FC<{ duration: number; children: React.ReactNode; bg: string }> = ({ duration, children, bg }) => {
  const f = useCurrentFrame();
  const out = interpolate(f, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const inn = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: 0, background: bg }}>
      <div style={{ position: "absolute", inset: 0, opacity: Math.min(out, inn) }}>{children}</div>
    </div>
  );
};

/** Escala de cinco módulos. `score` puede ser decimal para animar el llenado. */
export const Scale: React.FC<{ score: number; size: number; gap?: number; dark?: boolean; outline?: boolean; onAccent?: boolean }> = ({
  score,
  size,
  gap,
  dark,
  outline = true,
  onAccent,
}) => {
  const g = gap ?? Math.max(2, Math.round(size / 4.5));
  const on = dark ? C.paper : C.ink;
  const acc = onAccent ? C.white : dark ? C.accentDark : C.accent;
  const off = dark ? C.lineDark : C.line;
  return (
    <div style={{ display: "flex", gap: g }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, score - i));
        const col = i === 4 ? acc : on;
        return (
          <div
            key={i}
            style={{
              width: size,
              height: size,
              boxShadow: outline ? `inset 0 0 0 ${Math.max(1.5, size / 12)}px ${off}` : undefined,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: col,
                transform: `scale(${fill})`,
                opacity: fill > 0 ? 1 : 0,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export const Wordmark: React.FC<{ size: number; dark?: boolean; onAccent?: boolean }> = ({ size, dark, onAccent }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.55 }}>
    <Scale score={5} size={size * 0.38} gap={Math.max(2, size * 0.13)} dark={dark} outline={false} onAccent={onAccent} />
    <div style={{ ...display, fontSize: size, letterSpacing: "-0.02em", color: dark ? C.paper : C.ink, whiteSpace: "nowrap" }}>
      Estudio Digital Pro
    </div>
  </div>
);

/** Texto que entra palabra a palabra. */
export const Words: React.FC<{ text: string; start: number; step?: number; style?: React.CSSProperties; accentWord?: string }> = ({
  text,
  start,
  step = 3,
  style,
}) => {
  const f = useCurrentFrame();
  const words = text.split(" ");
  return (
    <span style={style}>
      {words.map((w, i) => {
        const t = interpolate(f, [start + i * step, start + i * step + 14], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: ease,
        });
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.08em" }}>
            <span style={{ display: "inline-block", transform: `translateY(${(1 - t) * 105}%)`, opacity: t }}>
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          </span>
        );
      })}
    </span>
  );
};

export const Eyebrow: React.FC<{ children: React.ReactNode; dark?: boolean; style?: React.CSSProperties }> = ({ children, dark, style }) => (
  <div
    style={{
      ...sans,
      fontSize: 22,
      fontWeight: 600,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: dark ? C.mutedDark : C.muted,
      display: "flex",
      alignItems: "center",
      gap: 16,
      ...style,
    }}
  >
    {children}
  </div>
);

export const SampleTag: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <div
    style={{
      ...mono,
      position: "absolute",
      right: 72,
      bottom: 56,
      fontSize: 18,
      color: dark ? C.mutedDark : C.muted,
    }}
  >
    Cifras de ejemplo
  </div>
);

export type LeadData = { title: string; detail: string; score: number; action: string };

export const LeadRow: React.FC<{
  lead: LeadData;
  score: number;
  dark?: boolean;
  dim?: number;
  width?: number;
  showAction?: boolean;
}> = ({ lead, score, dark, dim = 0, width = 900, showAction = true }) => {
  const text = dark ? C.paper : C.ink;
  const sub = dark ? C.mutedDark : C.muted;
  return (
    <div
      style={{
        width,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "26px 34px",
        background: dark ? "#1b1914" : C.white,
        border: `1.5px solid ${dark ? C.lineDark : C.line}`,
        ...sans,
        opacity: 1 - dim * 0.6,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 30, fontWeight: 600, color: dim > 0.5 ? sub : text, textDecoration: dim > 0.5 ? "line-through" : "none" }}>
          {lead.title}
        </div>
        <div style={{ fontSize: 22, color: sub }}>{lead.detail}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
        <Scale score={score} size={22} gap={5} dark={dark} />
        {showAction && (
          <div
            style={{
              ...mono,
              fontSize: 19,
              color: lead.score === 5 ? text : sub,
              opacity: score >= lead.score - 0.01 ? 1 : 0,
            }}
          >
            {lead.action}
          </div>
        )}
      </div>
    </div>
  );
};

export const LEADS: LeadData[] = [
  { title: "Reforma integral · piso 90 m²", detail: "Presupuesto aprobado · empieza en noviembre", score: 5, action: "Llamar hoy" },
  { title: "Consulta de precio", detail: "Sin datos ni plazo", score: 1, action: "Descartar" },
  { title: "Implante dental", detail: "Quiere cita esta semana", score: 4, action: "Llamar esta semana" },
  { title: "Placas solares", detail: "Vive de alquiler · no decide él", score: 2, action: "Respuesta automática" },
  { title: "Software de gestión · 3 sedes", detail: "Demo solicitada · decide el gerente", score: 5, action: "Llamar hoy" },
  { title: "Curso de formación", detail: "Compara varias opciones", score: 2, action: "Respuesta automática" },
];

export const Dots: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundImage: `radial-gradient(${dark ? "#2a2822" : C.line} 1.5px, transparent 1.8px)`,
      backgroundSize: "36px 36px",
      opacity: 0.8,
    }}
  />
);
