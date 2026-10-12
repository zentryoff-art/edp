import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, display, mono, sans, serif } from "./theme";
import { Dots, SampleTag, Scale, Wordmark } from "./parts";
import { ArrowDown, Check, H, Pill, Pop, Scene, Scramble, Strike, clamp, num, snap, useCount, usePop, usePulse } from "./kit";

/** Fotograma de la escena en que se dice `word` (ya adelantado para que el texto entre a la vez). */
export type Cue = (word: string, fallback: number, nth?: number) => number;

export type SceneProps = {
  d: number;
  cue: Cue;
  /** Inicio de cada frase de la escena (planos del panel). */
  starts?: number[];
};

const PAD = 120;
const col = (gap: number): React.CSSProperties => ({ padding: PAD, justifyContent: "center", gap });

// ── 1 · Gancho (0–3 s) ────────────────────────
const Stat: React.FC<{ at: number; to: number; label: string; strike?: boolean }> = ({ at, to, label, strike }) => {
  const n = Math.round(useCount(at, to, 14));
  const big = <span style={{ ...display, fontSize: 76, fontVariantNumeric: "tabular-nums" }}>{n}</span>;
  return (
    <Pop at={at} from="up" dist={40}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, padding: "16px 30px", border: `3px solid ${C.ink}`, background: C.white, color: C.ink }}>
        {strike ? <Strike at={at + 10}>{big}</Strike> : big}
        <span style={{ ...sans, fontSize: 34, fontWeight: 600, color: C.muted }}>{label}</span>
      </div>
    </Pop>
  );
};

export const Hook: React.FC<SceneProps> = ({ d, cue }) => {
  const b = cue("basura", 22);
  return (
    <Scene d={d} bg={C.paper} first>
      <Dots />
      <AbsoluteFill style={col(56)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Pop at={-4}>
            <div style={H(150, C.ink)}>¿Pagas publicidad</div>
          </Pop>
          <Pop at={cue("llegan", 9)}>
            <div style={H(150, C.ink)}>y te llegan leads</div>
          </Pop>
          <Pop at={b} from="slam" style={{ alignSelf: "flex-start" }}>
            <div style={{ ...H(190, C.white), background: C.accent, padding: "6px 40px 22px", transform: "rotate(-2deg)" }}>basura?</div>
          </Pop>
        </div>
        <div style={{ display: "flex", gap: 22 }}>
          <Stat at={b + 12} to={47} label="leads este mes" />
          <Stat at={b + 20} to={31} label="no contestan" strike />
          <Stat at={b + 28} to={9} label="ni son de tu zona" strike />
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

// ── 2 · Dolor: la agencia ─────────────────────
const Tag: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => (
  <Pop at={at} from="scale">
    <div style={{ ...sans, fontSize: 40, fontWeight: 600, color: C.paper, padding: "16px 28px", border: `3px solid ${C.lineDark}`, background: "#1b1914" }}>{children}</div>
  </Pop>
);

export const Agency: React.FC<SceneProps> = ({ d, cue }) => {
  const at = cue("cara", 5);
  const fee = useCount(at, 900, 14);
  const p = cue("permanencia", 28);
  return (
    <Scene d={d} bg={C.night}>
      <Dots dark />
      <AbsoluteFill style={col(36)}>
        <Pop at={Math.min(at - 6, cue("Agencia", 0))}>
          <div style={H(110, C.paper)}>Tu agencia te cobra</div>
        </Pop>
        <Pop at={at} from="scale">
          <div style={{ ...H(250, C.accentDark), fontVariantNumeric: "tabular-nums", lineHeight: 0.9 }}>
            {num(Math.round(fee))} €<span style={{ fontSize: 96, color: C.mutedDark }}> /mes</span>
          </div>
        </Pop>
        <div style={{ display: "flex", gap: 20 }}>
          <Tag at={p}>Permanencia: 12 meses</Tag>
          <Tag at={p + 8}>Contrato firmado</Tag>
        </div>
        <div style={{ display: "flex", gap: 28 }}>
          <Pop at={cue("los", 54)}>
            <div style={H(100, C.paper)}>¿Y los resultados?</div>
          </Pop>
          <Pop at={cue("Ni", 62)} from="slam">
            <div style={H(100, C.accentDark)}>Ni idea.</div>
          </Pop>
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

// ── 3 · Dolor: no sabes lo que te cuesta ──────
const Unknown: React.FC<{ at: number; settle: number; label: string; seed: string }> = ({ at, settle, label, seed }) => (
  <Pop at={at} from="up" dist={50}>
    <div style={{ width: 700, padding: "34px 40px", background: C.white, border: `3px solid ${C.ink}`, display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ ...sans, fontSize: 36, fontWeight: 600, color: C.muted }}>{label}</span>
      <Scramble settle={settle} final="¿ ?" seed={seed} style={{ ...display, fontSize: 130, color: C.ink, lineHeight: 1 }} finalStyle={{ color: C.accent }} />
    </div>
  </Pop>
);

export const Blind: React.FC<SceneProps> = ({ d, cue }) => {
  const box = cue("lead", 20);
  const settle = cue("sabes", 50);
  return (
    <Scene d={d} bg={C.paper}>
      <AbsoluteFill style={col(50)}>
        <div>
          <Pop at={cue("Cuanto", 0)}>
            <div style={H(130, C.ink)}>¿Cuánto te cuesta</div>
          </Pop>
          <Pop at={cue("cada", 7)}>
            <div style={H(130, C.ink)}>
              cada <span style={{ color: C.accent }}>lead</span>?
            </div>
          </Pop>
        </div>
        <div style={{ display: "flex", gap: 30 }}>
          <Unknown at={box} settle={settle} label="Gastado este mes" seed="gasto" />
          <Unknown at={box + 6} settle={settle + 4} label="Coste por lead" seed="cpl" />
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

// ── 4 · Dolor: teléfono parado y curiosos ─────
export const Silence: React.FC<SceneProps> = ({ d, cue }) => {
  const p = cue("parado", 6);
  return (
    <Scene d={d} bg={C.night}>
      <Dots dark />
      <AbsoluteFill style={col(40)}>
        <div>
          <Pop at={cue("Meses", 0)}>
            <div style={H(120, C.paper)}>Meses con el teléfono</div>
          </Pop>
          <Pop at={p} from="slam">
            <div style={H(160, C.accentDark)}>parado.</div>
          </Pop>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {["Ene", "Feb", "Mar", "Abr", "May"].map((m, i) => (
            <Pop key={m} at={p + 6 + i * 4} from="down" dist={40}>
              <div style={{ width: 170, padding: "16px 0", border: `3px solid ${C.lineDark}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ ...mono, fontSize: 30, color: C.mutedDark }}>{m}</span>
                <span style={{ ...display, fontSize: 72, color: C.paper }}>0</span>
              </div>
            </Pop>
          ))}
        </div>
        <div style={{ display: "flex", gap: 26 }}>
          <Pop at={cue("cuando", 50)}>
            <div style={H(96, C.paper)}>Y cuando suena,</div>
          </Pop>
          <Pop at={cue("nada", 62)} from="slam">
            <div style={H(96, C.accentDark)}>nada serio.</div>
          </Pop>
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

// ── 5 · Giro: cómo lo hacemos ─────────────────
const Zone: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", right: 90, top: 380, width: 400, height: 400 }}>
      {[0, 1, 2].map((i) => {
        const s = usePop(at + i * 5);
        const breathe = 1 + Math.sin((f - at) / 8 + i) * 0.02;
        const size = 140 + i * 130;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 200 - size / 2,
              top: 200 - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              border: `4px solid ${C.white}`,
              opacity: s * (1 - i * 0.25),
              transform: `scale(${s * breathe})`,
            }}
          />
        );
      })}
      <Pop at={at + 4} from="slam" origin="center" style={{ position: "absolute", left: 172, top: 172 }}>
        <div style={{ width: 56, height: 56, background: C.ink }} />
      </Pop>
      <Pop at={at + 14} from="up" dist={30} style={{ position: "absolute", left: 0, right: 0, top: 420, textAlign: "center" }}>
        <span style={{ ...mono, fontSize: 30, color: C.ink, whiteSpace: "nowrap" }}>Meta Ads · solo tu zona</span>
      </Pop>
    </div>
  );
};

export const Turn: React.FC<SceneProps> = ({ d, cue }) => (
  <Scene d={d} bg={C.accent}>
    <AbsoluteFill style={col(30)}>
      <Pop at={0} from="down" dist={40}>
        <Wordmark size={44} onAccent />
      </Pop>
      <Pop at={cue("Asi", 6)}>
        <div style={H(110, C.ink)}>Así lo hacemos:</div>
      </Pop>
      <div>
        <Pop at={cue("solo", 22)}>
          <div style={H(92, C.white)}>Solo leads cualificados</div>
        </Pop>
        <Pop at={cue("zona", 30) - 4}>
          <div style={H(92, C.white)}>de tu zona.</div>
        </Pop>
      </div>
      <Pop at={cue("tu", 50, 1)} from="slam" style={{ alignSelf: "flex-start" }}>
        <div style={{ ...H(110, C.paper), background: C.ink, padding: "8px 32px 18px" }}>Tú cierras.</div>
      </Pop>
    </AbsoluteFill>
    <Zone at={cue("zona", 22)} />
  </Scene>
);

// ── 6 · Giro: sin permanencia + prueba ────────
export const Trial: React.FC<SceneProps> = ({ d, cue }) => {
  const f = useCurrentFrame();
  const from = cue("pagamos", 46);
  const to = Math.max(from + 10, cue("nosotros", 56) + 8);
  const spend = useCount(from, 0, to - from, 450);
  const done = f >= to;
  const zero = usePop(to, 7);
  return (
    <Scene d={d} bg={C.paper}>
      <AbsoluteFill style={col(44)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {["Sin permanencia.", "Sin contrato."].map((t, i) => (
            <Pop key={t} at={cue("Sin", i * 10, i)} from="slam">
              <div style={{ ...H(130, C.ink), display: "flex", alignItems: "center", gap: 34 }}>
                <span style={{ width: 44, height: 44, background: C.accent, flexShrink: 0 }} />
                {t}
              </div>
            </Pop>
          ))}
        </div>
        <Pop at={cue("prueba", 28)} from="up" style={{ alignSelf: "flex-start" }}>
          <div style={{ background: C.white, border: `4px solid ${C.ink}`, padding: "34px 48px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={H(76, C.ink)}>Prueba de 10–15 días</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 30 }}>
              <span style={{ ...sans, fontSize: 44, fontWeight: 600, color: C.muted }}>Tu gasto en anuncios:</span>
              <span
                style={{
                  ...display,
                  fontSize: 130,
                  color: done ? C.accent : C.ink,
                  fontVariantNumeric: "tabular-nums",
                  display: "inline-block",
                  transform: `scale(${done ? 1.5 - 0.5 * zero : 1})`,
                  transformOrigin: "left center",
                }}
              >
                {num(Math.round(spend))} €
              </span>
            </div>
          </div>
        </Pop>
      </AbsoluteFill>
    </Scene>
  );
};

// ── 7 · Área de cliente (demo, ~10 s en 4 planos) ──
type Lead = { name: string; job: string; town: string; when: string; status: "Nuevo" | "Contactado" | "Cita" };
/** Del más reciente al más antiguo: entran de abajo arriba, uno cada 9 fotogramas. */
const NEW: Lead[] = [
  { name: "Marta G.", job: "Cocina + suelo", town: "Móstoles", when: "ahora", status: "Nuevo" },
  { name: "Javier S.", job: "Cambio de bañera", town: "Fuenlabrada", when: "ahora", status: "Nuevo" },
  { name: "Ana P.", job: "Reforma integral", town: "Alcorcón", when: "1 min", status: "Nuevo" },
  { name: "Carlos R.", job: "Baño completo", town: "Leganés", when: "3 min", status: "Nuevo" },
  { name: "Laura M.", job: "Reforma de cocina", town: "Getafe", when: "6 min", status: "Nuevo" },
];
const OLD: Lead[] = [
  { name: "Pedro L.", job: "Baño completo", town: "Getafe", when: "ayer", status: "Cita" },
  { name: "Elena V.", job: "Reforma de cocina", town: "Parla", when: "ayer", status: "Contactado" },
  { name: "Raúl T.", job: "Reforma integral", town: "Pinto", when: "2 días", status: "Cita" },
  { name: "Sonia B.", job: "Cocina", town: "Getafe", when: "2 días", status: "Contactado" },
  { name: "Iván C.", job: "Baño", town: "Leganés", when: "3 días", status: "Contactado" },
  { name: "Lucía F.", job: "Reforma integral", town: "Getafe", when: "3 días", status: "Cita" },
];
const SPEND = 534;
const CAMPAIGNS = [
  { name: "Reforma de cocina", sub: "Meta Ads · Sur de Madrid", status: "Activa", cpl: 11.8 },
  { name: "Baño completo", sub: "Meta Ads · radio 15 km", status: "Activa", cpl: 12.9 },
  { name: "Reforma integral", sub: "Meta Ads · radio 20 km", status: "Aprendiendo", cpl: 16.4 },
];
const TREND = [19.8, 18.9, 19.2, 17.6, 16.8, 17.1, 15.9, 15.2, 14.8, 14.9, 13.7, 13.1, 12.8, 12.4];

const statusPill = (s: Lead["status"]) =>
  s === "Nuevo" ? <Pill bg={C.accent} fg={C.white}>Nuevo</Pill> : s === "Cita" ? <Pill bg={C.ink} fg={C.paper}>Cita</Pill> : <Pill bg={C.white} fg={C.muted} border={C.line}>Contactado</Pill>;

const LeadLine: React.FC<{ l: Lead }> = ({ l }) => (
  <div style={{ height: 74, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", borderBottom: `1.5px solid ${C.line}` }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 26, fontWeight: 600, color: C.ink }}>{l.name}</span>
      <span style={{ fontSize: 20, color: C.muted }}>
        {l.job} · {l.town}
      </span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <span style={{ ...mono, fontSize: 18, color: C.muted }}>{l.when}</span>
      {statusPill(l.status)}
    </div>
  </div>
);

const NewLead: React.FC<{ l: Lead & { at: number } }> = ({ l }) => {
  const f = useCurrentFrame();
  const s = usePop(l.at, 8);
  const flash = interpolate(f, [l.at, l.at + 30], [0.16, 0], clamp);
  if (f < l.at) return null;
  return (
    <div style={{ height: 74 * Math.min(1, s), overflow: "hidden", background: `rgba(231,86,35,${flash})`, transform: `translateX(${(1 - s) * -60}px)` }}>
      <LeadLine l={l} />
    </div>
  );
};

const Kpi: React.FC<{ at: number; label: string; value: string; accent?: boolean; hot?: number }> = ({ at, label, value, accent, hot = 0 }) => (
  <Pop at={at} from="up" dist={30} style={{ flex: 1 }}>
    <div style={{ padding: "18px 24px", background: C.white, border: `1.5px solid ${C.line}`, borderTop: `4px solid ${accent ? C.accent : C.ink}`, display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 22, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 54, fontWeight: 600, color: C.ink, fontVariantNumeric: "tabular-nums", transform: `scale(${1 + hot * 0.08})`, transformOrigin: "left center" }}>{value}</span>
    </div>
  </Pop>
);

const Trend: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const w = 560;
  const h = 170;
  const max = 21;
  const min = 11;
  const pts = TREND.map((v, i) => [(i / (TREND.length - 1)) * w, h - ((v - min) / (max - min)) * h] as const);
  const path = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const draw = interpolate(f, [at, at + 22], [0, 1], { ...clamp, easing: snap });
  const end = pts[pts.length - 1];
  const dot = usePop(at + 18);
  return (
    <svg width={w + 20} height={h + 20} viewBox={`-10 -10 ${w + 20} ${h + 20}`} style={{ overflow: "visible" }}>
      <path d={path} fill="none" stroke={C.ink} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
      <rect x={end[0] - 9} y={end[1] - 9} width={18} height={18} fill={C.accent} transform={`translate(${end[0]} ${end[1]}) scale(${dot}) translate(${-end[0]} ${-end[1]})`} />
    </svg>
  );
};

/** Planos de cámara: [escala, x, y]. Cambian cuando empieza cada frase. */
const CAM: [number, number, number][] = [
  [1, 0, 0],
  [1.34, 410, -10],
  [1.34, -540, -10],
  [0.8, 0, -80],
];
const CAPTIONS: React.ReactNode[] = [
  <>Tu área de cliente. <span style={{ color: C.accentDark }}>En directo.</span></>,
  <>Cada lead, <span style={{ color: C.accentDark }}>al momento.</span></>,
  <>Coste y campañas, <span style={{ color: C.accentDark }}>a la vista.</span></>,
  <>Sin <span style={{ color: C.accentDark }}>perseguirnos.</span></>,
];
/** Sin locución: cuándo empieza cada plano. */
const PANEL_BEATS = [0, 74, 150, 224];

export const Panel: React.FC<SceneProps> = ({ d, cue, starts }) => {
  const f = useCurrentFrame();
  // Inicio de cada plano: 3 fotogramas antes de su frase.
  const beat = (starts && starts.length === 4 ? starts : PANEL_BEATS).map((b, i) => (i ? b - 3 : 0));
  const arrivals = NEW.map((_, i) => beat[1] + 6 + (NEW.length - 1 - i) * 9);

  let [s, x, y] = CAM[0];
  for (let k = 1; k < CAM.length; k++) {
    const [ks, kx, ky] = CAM[k];
    const t = interpolate(f, [beat[k], beat[k] + 10], [0, 1], { ...clamp, easing: snap });
    s += (ks - s) * t;
    x += (kx - x) * t;
    y += (ky - y) * t;
  }
  const rise = usePop(0, 9);

  // Leads: cuenta hasta 38 y luego suma uno por cada lead que entra.
  const arrived = arrivals.filter((a) => f >= a).length;
  const leadsIntro = Math.round(useCount(6, 38, 18));
  const cplIntro = useCount(12, SPEND / 38, 18);
  const leads = f < beat[1] ? leadsIntro : 38 + arrived;
  const cpl = f < beat[1] ? cplIntro : SPEND / leads;
  const lastArrival = Math.max(-99, ...arrivals.filter((a) => f >= a));
  const hot = interpolate(f - lastArrival, [0, 4, 10], [0, 1, 0], clamp);
  const spend = useCount(9, SPEND, 18);
  const live = Math.floor(f / 12) % 2 === 0;

  const ctaAt = cue("Rellena", 238);
  const cta = usePop(ctaAt, 8);
  const ctaPulse = usePulse(ctaAt + 12);

  return (
    <Scene d={d} bg={C.night}>
      <Dots dark />
      {/* Interfaz */}
      <div
        style={{
          position: "absolute",
          left: 220,
          top: 236,
          width: 1480,
          height: 780,
          transformOrigin: "center center",
          transform: `translate(${x}px, ${y + (1 - rise) * 260}px) scale(${s * (0.9 + 0.1 * rise)})`,
          opacity: Math.min(1, rise * 2),
        }}
      >
        <div style={{ width: "100%", height: "100%", background: C.paper, border: `1.5px solid ${C.line}`, boxShadow: "0 40px 120px rgba(0,0,0,.45)", ...sans, display: "flex", flexDirection: "column" }}>
          <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", background: C.white, borderBottom: `1.5px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <Scale score={5} size={14} gap={4} outline={false} />
              <span style={{ fontSize: 26, fontWeight: 600, color: C.ink }}>Área de cliente</span>
              <span style={{ fontSize: 22, color: C.muted }}>Reformas López · Getafe</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 14, height: 14, borderRadius: "50%", background: C.accent, opacity: live ? 1 : 0.3 }} />
              <span style={{ ...mono, fontSize: 20, color: C.ink }}>En directo</span>
            </div>
          </div>
          <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 22, flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", gap: 18 }}>
              <Kpi at={4} label="Leads este mes" value={String(leads)} hot={hot} />
              <Kpi at={8} label="Coste por lead" value={`${num(cpl, 2)} €`} accent hot={hot} />
              <Kpi at={12} label="Gasto este mes" value={`${num(Math.round(spend))} €`} />
              <Kpi at={16} label="Campañas" value="3 activas" />
            </div>
            <div style={{ display: "flex", gap: 22, flex: 1, minHeight: 0 }}>
              <div style={{ flex: 1.35, background: C.white, border: `1.5px solid ${C.line}`, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={{ padding: "14px 22px", fontSize: 24, fontWeight: 600, color: C.ink, borderBottom: `1.5px solid ${C.line}` }}>Últimos leads</div>
                <div style={{ overflow: "hidden", flex: 1 }}>
                  {NEW.map((l, i) => (
                    <NewLead key={l.name} l={{ ...l, at: arrivals[i] }} />
                  ))}
                  {OLD.map((l) => (
                    <LeadLine key={l.name} l={l} />
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, background: C.white, border: `1.5px solid ${C.line}`, display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "14px 22px", fontSize: 24, fontWeight: 600, color: C.ink, borderBottom: `1.5px solid ${C.line}` }}>Campañas</div>
                {CAMPAIGNS.map((c, i) => (
                  <div key={c.name} style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", borderBottom: `1.5px solid ${C.line}`, background: `rgba(231,86,35,${interpolate(f, [beat[2] + 2 + i * 7, beat[2] + 3 + i * 7, beat[2] + 26 + i * 7], [0, 0.18, 0], clamp)})` }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 23, fontWeight: 600, color: C.ink }}>{c.name}</span>
                      <span style={{ fontSize: 18, color: C.muted }}>{c.sub}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      {c.status === "Activa" ? <Pill bg={C.ink} fg={C.paper} size={18}>● Activa</Pill> : <Pill bg={C.white} fg={C.muted} border={C.line} size={18}>Aprendiendo</Pill>}
                      <span style={{ fontSize: 26, fontWeight: 600, color: C.ink, fontVariantNumeric: "tabular-nums", width: 110, textAlign: "right" }}>
                        {num(useCount(14 + i * 4, c.cpl, 16), 2)} €
                      </span>
                    </div>
                  </div>
                ))}
                <div style={{ padding: "16px 22px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 22, color: C.muted }}>Coste por lead · 14 días</span>
                  <Pop at={beat[2] + 14} from="scale" origin="right center">
                    <Pill bg={C.accent} fg={C.white} size={22}>−37 %</Pill>
                  </Pop>
                </div>
                <div style={{ padding: "10px 22px" }}>
                  <Trend at={22} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtítulo del plano */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 230, background: `linear-gradient(${C.night} 70%, rgba(17,15,11,0))` }} />
      {CAPTIONS.map((text, i) => {
        const at = beat[i];
        const next = beat[i + 1] ?? d;
        if (f < at - 1 || f >= next) return null;
        return (
          <Pop key={at} at={at} from="up" dist={40} origin="center" style={{ position: "absolute", left: 0, right: 0, top: 62, textAlign: "center" }}>
            <span style={H(80, C.paper)}>{text}</span>
          </Pop>
        );
      })}

      {/* CTA intermedio */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 56,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 30,
          opacity: interpolate(f, [ctaAt, ctaAt + 3], [0, 1], clamp),
          transform: `translateY(${(1 - cta) * 80}px) scale(${ctaPulse})`,
        }}
      >
        <div style={{ ...H(64, C.ink), background: C.accentDark, padding: "14px 36px 22px", display: "flex", alignItems: "center", gap: 24 }}>
          Rellena el formulario <ArrowDown size={60} color={C.ink} from={ctaAt + 8} />
        </div>
        <span style={{ ...serif, fontSize: 40, color: C.paper }}>y lo ves con tus leads.</span>
      </div>
      {f < beat[3] && <SampleTag dark />}
    </Scene>
  );
};

// ── 8 · Seguimiento con Jorge ─────────────────
export const Jorge: React.FC<SceneProps> = ({ d, cue }) => {
  const f = useCurrentFrame();
  const card = cue("Jorge", 20);
  const secs = Math.max(0, Math.floor((f - card) * 4.2));
  const clock = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  return (
    <Scene d={d} bg={C.paper}>
      <Dots />
      <AbsoluteFill style={col(44)}>
        <div>
          <Pop at={cue("cada", 0)}>
            <div style={H(120, C.ink)}>Cada semana,</div>
          </Pop>
          <Pop at={cue("llamada", 7)}>
            <div style={H(120, C.ink)}>
              una llamada con <span style={{ color: C.accent }}>Jorge</span>.
            </div>
          </Pop>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 50 }}>
          <Pop at={card} from="left">
            <div style={{ display: "flex", alignItems: "center", gap: 30, padding: "26px 40px 26px 26px", background: C.white, border: `3px solid ${C.ink}` }}>
              <div style={{ width: 130, height: 130, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", ...display, fontSize: 92, color: C.white }}>J</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ ...display, fontSize: 60, color: C.ink }}>Jorge</span>
                <span style={{ ...sans, fontSize: 30, color: C.muted }}>Tu contacto en Estudio Digital Pro</span>
                <span style={{ ...mono, fontSize: 30, color: C.accent, fontVariantNumeric: "tabular-nums" }}>● En llamada · {clock}</span>
              </div>
            </div>
          </Pop>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {["Semana 1", "Semana 2", "Semana 3"].map((w, i) => (
              <Pop key={w} at={card + 10 + i * 6} from="right" dist={30}>
                <div style={{ display: "flex", alignItems: "center", gap: 18, ...sans, fontSize: 38, fontWeight: 600, color: C.ink }}>
                  <Check size={46} />
                  {w}
                </div>
              </Pop>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

// ── 9 · Oferta: qué consigues, riesgo cero ────
export const Offer: React.FC<SceneProps> = ({ d, cue }) => {
  const gets: [string, number][] = [
    ["Leads de tu zona que sí contestan", cue("Leads", 8)],
    ["Sabes lo que pagas por cada uno", cue("contestan", 11) + 8],
    ["Sin permanencia ni contrato", cue("permanencia", 30)],
  ];
  return (
    <Scene d={d} bg={C.night}>
      <Dots dark />
      <AbsoluteFill style={col(30)}>
        <Pop at={0}>
          <div style={{ ...H(96, C.paper), marginBottom: 14 }}>Lo que consigues:</div>
        </Pop>
        {gets.map(([g, at]) => (
          <Pop key={g} at={at} from="left" dist={40}>
            <div style={{ display: "flex", alignItems: "center", gap: 28, ...sans, fontSize: 60, fontWeight: 600, color: C.paper, whiteSpace: "nowrap" }}>
              <Check size={66} bg={C.accentDark} fg={C.ink} />
              {g}
            </div>
          </Pop>
        ))}
      </AbsoluteFill>
      <Pop at={cue("riesgo", 58)} from="slam" origin="center" style={{ position: "absolute", right: 120, bottom: 110 }}>
        <div style={{ ...H(110, C.ink), background: C.accentDark, padding: "10px 40px 22px", transform: "rotate(-5deg)" }}>Riesgo cero.</div>
      </Pop>
    </Scene>
  );
};

// ── 10 · CTA final (se queda hasta el último fotograma) ──
export const Cta: React.FC<SceneProps> = ({ d, cue }) => {
  const f = useCurrentFrame();
  const btnAt = cue("abajo", 30);
  const btn = usePop(btnAt, 8);
  const pulse = usePulse(btnAt + 14);
  const glow = interpolate(f, [btnAt, btnAt + 10], [0, 1], { ...clamp, easing: snap });
  const go = cue("empieza", 18);
  return (
    <Scene d={d} bg={C.accent} last>
      <AbsoluteFill style={{ padding: PAD, justifyContent: "space-between" }}>
        <Pop at={0} from="down" dist={30}>
          <Wordmark size={40} onAccent />
        </Pop>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <Pop at={cue("Rellena", 2)} from="slam">
              <div style={H(180, C.ink)}>Rellena</div>
            </Pop>
            <Pop at={cue("formulario", 8)} from="slam">
              <div style={H(180, C.ink)}>el formulario.</div>
            </Pop>
          </div>
          <Pop at={go}>
            <div style={H(70, C.white)}>Y empieza tu prueba de 10–15 días.</div>
          </Pop>
          <Pop at={go + 10}>
            <div style={{ ...serif, fontSize: 44, color: C.ink }}>Publicidad de la prueba a nuestra cuenta · Sin permanencia</div>
          </Pop>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div
            style={{
              ...sans,
              fontSize: 44,
              fontWeight: 700,
              background: C.ink,
              color: C.paper,
              padding: "28px 44px",
              display: "flex",
              alignItems: "center",
              gap: 22,
              opacity: Math.min(1, btn * 2),
              transform: `scale(${(0.7 + 0.3 * btn) * pulse})`,
              transformOrigin: "left center",
              boxShadow: `0 0 0 ${glow * 10}px rgba(22,20,15,${0.18 * glow})`,
            }}
          >
            Rellenar el formulario
            <ArrowDown size={52} color={C.accentDark} from={btnAt + 8} />
          </div>
          <Pop at={btnAt + 8} from="right" dist={30}>
            <span style={{ ...mono, fontSize: 32, color: C.ink }}>Está justo debajo del vídeo</span>
          </Pop>
        </div>
      </AbsoluteFill>
    </Scene>
  );
};
