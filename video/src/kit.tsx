import React from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, display, sans } from "./theme";

/** Fotogramas que se solapan la salida de una escena y la entrada de la siguiente. */
export const OVERLAP = 6;

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
/** Expo-out: arranca a tope y frena en seco. */
export const snap = Easing.bezier(0.16, 1, 0.3, 1);

/** Spring enérgico (con un pelín de rebote) que se asienta en ~8 fotogramas = 0,27 s. */
export function usePop(at: number, dur = 8) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - at, fps, durationInFrames: dur, config: { damping: 12, stiffness: 220, mass: 0.6 } });
}

/** Contador rápido con frenada final. */
export function useCount(at: number, to: number, dur = 16, from = 0) {
  const f = useCurrentFrame();
  return interpolate(f, [at, at + dur], [from, to], { ...clamp, easing: snap });
}

/** 1234.5 → "1.234,50" */
export function num(n: number, dec = 0) {
  const [i, d] = n.toFixed(dec).split(".");
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return d ? `${int},${d}` : int;
}

type From = "up" | "down" | "left" | "right" | "scale" | "slam";

/** Entrada de un elemento en 0,2–0,3 s. `slam` entra grande y golpea. */
export const Pop: React.FC<{ at: number; from?: From; dist?: number; origin?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({
  at,
  from = "up",
  dist = 70,
  origin = "left center",
  style,
  children,
}) => {
  const f = useCurrentFrame();
  const s = usePop(at);
  const o = interpolate(f, [at, at + 3], [0, 1], clamp);
  const t = {
    up: `translateY(${(1 - s) * dist}px)`,
    down: `translateY(${(s - 1) * dist}px)`,
    left: `translateX(${(s - 1) * dist * 1.6}px)`,
    right: `translateX(${(1 - s) * dist * 1.6}px)`,
    scale: `scale(${0.55 + 0.45 * s})`,
    slam: `scale(${1.9 - 0.9 * s})`,
  }[from];
  return <div style={{ transformOrigin: origin, ...style, opacity: o, transform: t }}>{children}</div>;
};

/**
 * Contenedor de escena. Entra con una cortina desde la derecha (7 fotogramas) y
 * sale empujada a la izquierda mientras la siguiente ya la tapa: sin huecos.
 */
export const Scene: React.FC<{ d: number; bg: string; first?: boolean; last?: boolean; children: React.ReactNode }> = ({
  d,
  bg,
  first,
  last,
  children,
}) => {
  const f = useCurrentFrame();
  const wipe = first ? 1 : interpolate(f, [0, OVERLAP + 1], [0, 1], { ...clamp, easing: snap });
  const exit = last ? 0 : interpolate(f, [d - OVERLAP, d], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden", clipPath: first ? undefined : `inset(0 0 0 ${(1 - wipe) * 100}%)` }}>
      <AbsoluteFill style={{ transform: `translateX(${(1 - wipe) * 160 - exit * 160}px) scale(${1 + exit * 0.05})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Titular de marca. */
export const H = (size: number, color: string): React.CSSProperties => ({ ...display, fontSize: size, color, whiteSpace: "nowrap" });

/** Tachado que se dibuja de izquierda a derecha. */
export const Strike: React.FC<{ at: number; color?: string; children: React.ReactNode }> = ({ at, color = C.accent, children }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [at, at + 6], [0, 1], { ...clamp, easing: snap });
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span style={{ position: "absolute", left: -6, top: "50%", height: "0.12em", width: `calc(${t * 100}% + 12px)`, background: color }} />
    </span>
  );
};

/** Cifras que bailan hasta que `settle` las fija en `final`. */
export const Scramble: React.FC<{ settle: number; final: string; seed: string; style?: React.CSSProperties; finalStyle?: React.CSSProperties }> = ({
  settle,
  final,
  seed,
  style,
  finalStyle,
}) => {
  const f = useCurrentFrame();
  const s = usePop(settle, 7);
  if (f < settle) {
    const tick = Math.floor(f / 2);
    const dg = (i: number) => Math.floor(random(`${seed}-${tick}-${i}`) * 10);
    return (
      <span style={{ ...style, fontVariantNumeric: "tabular-nums" }}>
        {dg(0)}.{dg(1)}{dg(2)}{dg(3)},{dg(4)}{dg(5)} €
      </span>
    );
  }
  return <span style={{ ...style, ...finalStyle, display: "inline-block", transform: `scale(${1.6 - 0.6 * s})`, transformOrigin: "left center" }}>{final}</span>;
};

export const Check: React.FC<{ size: number; bg?: string; fg?: string }> = ({ size, bg = C.accent, fg = C.white }) => (
  <div style={{ width: size, height: size, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <svg viewBox="0 0 24 24" width={size * 0.66} height={size * 0.66}>
      <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={fg} strokeWidth={3.4} strokeLinecap="square" />
    </svg>
  </div>
);

/** Flecha hacia abajo que rebota: señala el formulario bajo el vídeo. */
export const ArrowDown: React.FC<{ size: number; color: string; from: number }> = ({ size, color, from }) => {
  const f = useCurrentFrame();
  const bounce = f > from ? Math.abs(Math.sin((f - from) / 6)) * size * 0.22 : 0;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ transform: `translateY(${bounce}px)`, flexShrink: 0 }}>
      <path d="M12 3v16M5 12l7 7 7-7" fill="none" stroke={color} strokeWidth={3} strokeLinecap="square" />
    </svg>
  );
};

/** Pulso suave para botones que ya han entrado. */
export function usePulse(from: number, amp = 0.035) {
  const f = useCurrentFrame();
  return f > from ? 1 + Math.max(0, Math.sin((f - from) / 7)) * amp : 1;
}

export const Pill: React.FC<{ children: React.ReactNode; bg: string; fg: string; border?: string; size?: number }> = ({ children, bg, fg, border, size = 20 }) => (
  <span
    style={{
      ...sans,
      fontSize: size,
      fontWeight: 600,
      padding: "6px 14px",
      background: bg,
      color: fg,
      border: border ? `1.5px solid ${border}` : undefined,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);
