import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, display, mono, sans, serif } from "./theme";
import { Dots, Eyebrow, LEADS, LeadRow, SampleTag, Scale, SceneFade, Wordmark, Words, ease, useSpring, useT } from "./parts";

export type SceneProps = {
  d: number;
  /** Fotograma de la escena en que la locución dice esa palabra. */
  cue: (word: string, fallback?: number) => number;
};

const PAD = 120;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ── 1 · Gancho ────────────────────────────────
export const Hook: React.FC<SceneProps> = ({ d, cue }) => {
  const f = useCurrentFrame();
  const mark = useT(4, 16);
  const sub = cue("Si", 90);
  return (
    <SceneFade duration={d} bg={C.paper}>
      <Dots />
      <AbsoluteFill style={{ padding: PAD, justifyContent: "center", gap: 48 }}>
        <div style={{ opacity: mark }}>
          <Scale score={5 * mark} size={26} gap={6} outline={false} />
        </div>
        <div style={{ ...display, fontSize: 132, color: C.ink }}>
          <Words text="¿Cuántas llamadas" start={cue("Cuántas", 8)} />
          <br />
          <Words text="de ayer eran" start={cue("ayer", 22) - 4} />
          <br />
          <Words text="clientes de verdad?" start={cue("clientes", 32)} />
        </div>
        <div style={{ ...serif, fontSize: 40, color: C.muted, opacity: interpolate(f, [sub, sub + 14], [0, 1], clamp) }}>
          Si no lo sabes, estás pagando por averiguarlo.
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

// ── 2 · Problema ──────────────────────────────
export const Problem: React.FC<SceneProps> = ({ d, cue }) => {
  const f = useCurrentFrame();
  const count = Math.round(interpolate(f, [cue("Doscientos", 8), cue("contactos", 40) + 10], [0, 214], { ...clamp, easing: ease }));
  const judgeAt = cue("mayoría", 100);
  const judge = interpolate(f, [judgeAt, judgeAt + 18], [0, 1], { ...clamp, easing: ease });
  const dimAt = cue("curiosos", 140);
  const dim = interpolate(f, [dimAt, dimAt + 24], [0, 1], { ...clamp, easing: ease });
  return (
    <SceneFade duration={d} bg={C.night}>
      <Dots dark />
      <AbsoluteFill style={{ padding: PAD, flexDirection: "row", alignItems: "center", gap: 100 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 36 }}>
          <Eyebrow dark>Contactos de este mes</Eyebrow>
          <div style={{ ...display, fontSize: 300, color: C.paper, fontVariantNumeric: "tabular-nums", lineHeight: 0.85 }}>{count}</div>
          <div style={{ ...display, fontSize: 64, color: C.paper, opacity: judge, transform: `translateY(${(1 - judge) * 20}px)` }}>
            La mayoría no iba
            <br />a contratarte.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {LEADS.map((l, i) => {
            const s = useSpring(10 + i * 10);
            return (
              <div key={i} style={{ transform: `translateX(${(1 - s) * 80}px)`, opacity: s }}>
                <LeadRow lead={l} score={0} dark dim={l.score <= 2 ? dim : 0} width={820} showAction={false} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <SampleTag dark />
    </SceneFade>
  );
};

// ── 3 · Coste ─────────────────────────────────
export const Cost: React.FC<SceneProps> = ({ d, cue }) => {
  const f = useCurrentFrame();
  const at = cue("tiempo", 50);
  const fill = interpolate(f, [at, at + 70], [0, 0.71], { ...clamp, easing: ease });
  const items = ["Tiempo", "Llamadas", "Presupuesto en anuncios"];
  const itemAt = [cue("tiempo", 50), cue("llamadas", 62), cue("presupuesto", 74)];
  return (
    <SceneFade duration={d} bg={C.paper}>
      <AbsoluteFill style={{ padding: PAD, justifyContent: "center", gap: 64 }}>
        <div style={{ ...display, fontSize: 124, color: C.ink }}>
          <Words text="Y cada uno te costó" start={cue("cada", 4) - 4} />
          <br />
          <Words text="lo mismo." start={cue("mismo", 20) - 4} />
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          {items.map((t, i) => {
            const s = interpolate(f, [itemAt[i], itemAt[i] + 10], [0, 1], clamp);
            return (
              <div key={t} style={{ ...sans, fontSize: 30, fontWeight: 600, padding: "14px 22px", border: `2px solid ${C.ink}`, opacity: s, transform: `translateY(${(1 - s) * 12}px)` }}>
                {t}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1400 }}>
          <div style={{ ...sans, fontSize: 30, color: C.muted, display: "flex", justifyContent: "space-between" }}>
            <span>Presupuesto gastado en contactos que no contratan</span>
            <span style={{ ...display, fontSize: 56, color: C.ink, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              {Math.round(fill * 100)} %
            </span>
          </div>
          <div style={{ height: 28, background: C.line, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, width: `${fill * 100}%`, background: C.ink }} />
          </div>
        </div>
      </AbsoluteFill>
      <SampleTag />
    </SceneFade>
  );
};

// ── 4 · Marca ─────────────────────────────────
export const Brand: React.FC<SceneProps> = ({ d, cue }) => {
  const f = useCurrentFrame();
  const wAt = cue("Estudio", 20);
  const word = interpolate(f, [wAt, wAt + 20], [0, 1], { ...clamp, easing: ease });
  const lAt = cue("Conseguimos", 60);
  const line = interpolate(f, [lAt, lAt + 20], [0, 1], { ...clamp, easing: ease });
  return (
    <SceneFade duration={d} bg={C.night}>
      <AbsoluteFill style={{ padding: PAD, justifyContent: "center", alignItems: "center", gap: 64 }}>
        <div style={{ display: "flex", gap: 22 }}>
          {[0, 1, 2, 3, 4].map((i) => {
            const s = useSpring(2 + i * 5, 14);
            return (
              <div
                key={i}
                style={{
                  width: 96,
                  height: 96,
                  background: i === 4 ? C.accentDark : C.paper,
                  transform: `translateY(${(1 - s) * -160}px)`,
                  opacity: Math.min(1, s * 1.4),
                }}
              />
            );
          })}
        </div>
        <div style={{ overflow: "hidden" }}>
          <div style={{ ...display, fontSize: 120, letterSpacing: "-0.03em", color: C.paper, transform: `translateY(${(1 - word) * 110}%)` }}>
            Estudio Digital Pro
          </div>
        </div>
        <div style={{ ...serif, fontSize: 46, color: C.mutedDark, opacity: line, transform: `translateY(${(1 - line) * 16}px)`, textAlign: "center" }}>
          No clics, no promesas: sistemas que convierten.
        </div>
        <div style={{ position: "absolute", bottom: 60, ...mono, fontSize: 18, color: C.mutedDark, opacity: interpolate(f, [lAt + 20, lAt + 40], [0, 1], clamp) }}>
          Captación de clientes con IA
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

// ── 5 · Cómo funciona ─────────────────────────
const StepHead: React.FC<{ n: string; title: string; sub: string }> = ({ n, title, sub }) => {
  const t = useT(0, 18);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, width: 640, opacity: t, transform: `translateY(${(1 - t) * 24}px)` }}>
      <div style={{ ...mono, fontSize: 26, color: C.muted }}>{n}</div>
      <div style={{ ...display, fontSize: 108, color: C.ink }}>{title}</div>
      <div style={{ ...serif, fontSize: 38, lineHeight: 1.4, color: C.ink }}>{sub}</div>
    </div>
  );
};

export const Capture: React.FC<SceneProps> = ({ d, cue }) => {
  const chipsAt = cue("Google", 30);
  const leadsAt = cue("servicio", 60);
  return (
    <SceneFade duration={d} bg={C.paper}>
      <AbsoluteFill style={{ padding: PAD, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <StepHead n="01" title="Apareces" sub="En Google, Meta o TikTok, justo cuando alguien necesita tu servicio." />
        <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            {["Google", "Meta", "TikTok"].map((c, i) => {
              const s = useSpring(chipsAt - 4 + i * 8);
              return (
                <div key={c} style={{ ...sans, fontSize: 26, fontWeight: 600, padding: "14px 22px", background: C.ink, color: C.paper, opacity: s, transform: `scale(${0.8 + s * 0.2})` }}>
                  {c}
                </div>
              );
            })}
          </div>
          {LEADS.slice(0, 4).map((l, i) => {
            const s = useSpring(Math.min(leadsAt, chipsAt + 20) + i * 9);
            return (
              <div key={i} style={{ opacity: s, transform: `translateY(${(1 - s) * -30}px)` }}>
                <LeadRow lead={l} score={0} width={860} showAction={false} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <SampleTag />
    </SceneFade>
  );
};

export const Qualify: React.FC<SceneProps> = ({ d, cue }) => {
  const f = useCurrentFrame();
  const at = cue("nota", 60);
  return (
    <SceneFade duration={d} bg={C.paper}>
      <AbsoluteFill style={{ padding: PAD, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <StepHead n="02" title="Calificas" sub="Te avisamos al momento y le pones nota con un toque. El algoritmo aprende." />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {LEADS.slice(0, 4).map((l, i) => {
            const start = at + i * 14;
            const sc = interpolate(f, [start, start + 24], [0, l.score], { ...clamp, easing: ease });
            return <LeadRow key={i} lead={l} score={sc} width={860} />;
          })}
        </div>
      </AbsoluteFill>
      <SampleTag />
    </SceneFade>
  );
};

export const Report: React.FC<SceneProps> = ({ d, cue }) => {
  const f = useCurrentFrame();
  const at = cue("coste", 30) - 6;
  const n = (to: number, s: number) => Math.round(interpolate(f, [s, s + 40], [0, to], { ...clamp, easing: ease }));
  const rows = [
    { s: 5, leads: 23, cpl: "31,20 €" },
    { s: 4, leads: 38, cpl: "18,90 €" },
    { s: 3, leads: 57, cpl: "12,60 €" },
    { s: 2, leads: 64, cpl: "11,20 €" },
    { s: 1, leads: 32, cpl: "—" },
  ];
  const cpl = interpolate(f, [at + 10, at + 50], [0, 18.4], { ...clamp, easing: ease });
  const noteAt = cue("nota", at + 40);
  return (
    <SceneFade duration={d} bg={C.paper}>
      <AbsoluteFill style={{ padding: PAD, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <StepHead n="03" title="Lo ves todo" sub="En tu área de cliente: el coste por contacto, desglosado por nota." />
        <div style={{ width: 860, background: C.white, border: `1.5px solid ${C.line}`, padding: 44, display: "flex", flexDirection: "column", gap: 34, ...sans, fontVariantNumeric: "tabular-nums" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderTop: `3px solid ${C.ink}` }}>
            {[
              ["Leads", String(n(214, at))],
              ["Nota 4–5", String(n(61, at + 6))],
              ["CPL calificado", `${cpl.toFixed(2).replace(".", ",")} €`],
            ].map(([k, v], i) => (
              <div key={k} style={{ paddingTop: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 20, color: C.muted }}>{k}</span>
                <span style={{ fontSize: 50, fontWeight: 600, display: "flex", alignItems: "center", gap: 12 }}>
                  {v}
                  {i === 2 && <span style={{ width: 14, height: 14, background: C.accent }} />}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {rows.map((r, i) => {
              const w = interpolate(f, [noteAt - 10 + i * 5, noteAt + 30 + i * 5], [0, r.leads / 64], { ...clamp, easing: ease });
              return (
                <div key={r.s} style={{ display: "grid", gridTemplateColumns: "150px 1fr 140px", alignItems: "center", gap: 20, fontSize: 24 }}>
                  <Scale score={r.s} size={16} gap={4} />
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ height: 12, width: `${w * 85}%`, background: r.s === 5 ? C.accent : C.ink }} />
                    <span>{Math.round(w * 64)}</span>
                  </div>
                  <span style={{ textAlign: "right", color: C.muted }}>{r.cpl}</span>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
      <SampleTag />
    </SceneFade>
  );
};

// ── 6 · Resultado ─────────────────────────────
export const Result: React.FC<SceneProps> = ({ d, cue }) => {
  const f = useCurrentFrame();
  const head = useT(cue("Así", 8), 20);
  const fAt = cue("llamas", 20);
  const filter = interpolate(f, [fAt, fAt + 30], [0, 1], { ...clamp, easing: ease });
  const restAt = cue("resto", 90);
  return (
    <SceneFade duration={d} bg={C.night}>
      <AbsoluteFill style={{ padding: PAD, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ ...display, fontSize: 104, color: C.paper, width: 760, opacity: head, transform: `translateY(${(1 - head) * 24}px)` }}>
          Solo llamas a los que pueden contratarte.
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 860 }}>
          {LEADS.map((l, i) => {
            const h = l.score < 4 ? 1 - filter : 1;
            return (
              <div key={i} style={{ height: 124 * h, overflow: "hidden", opacity: h, marginBottom: 14 * h }}>
                <LeadRow lead={l} score={l.score} dark width={860} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: PAD, bottom: 60, ...mono, fontSize: 22, color: C.mutedDark, opacity: interpolate(f, [restAt, restAt + 14], [0, 1], clamp) }}>
        El resto recibe una respuesta automática. No se pierde ninguno.
      </div>
    </SceneFade>
  );
};

// ── 7 · Transparencia ─────────────────────────
export const Honest: React.FC<SceneProps> = ({ d, cue }) => {
  const f = useCurrentFrame();
  const at = cue("También", 44);
  const second = interpolate(f, [at, at + 16], [0, 1], { ...clamp, easing: ease });
  return (
    <SceneFade duration={d} bg={C.paper}>
      <Dots />
      <AbsoluteFill style={{ padding: PAD, justifyContent: "center", gap: 40 }}>
        <div style={{ ...display, fontSize: 100, color: C.ink }}>
          <Words text="Cifras cada mes." start={cue("Cifras", 4)} />
        </div>
        <div style={{ ...display, fontSize: 100, color: C.ink, display: "flex", alignItems: "center", gap: 36, whiteSpace: "nowrap", opacity: second, transform: `translateY(${(1 - second) * 24}px)` }}>
          <span style={{ width: 40, height: 40, background: C.accent, flexShrink: 0 }} />
          También cuando son malas.
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

// ── 8 · CTA ───────────────────────────────────
export const Cta: React.FC<SceneProps> = ({ cue }) => {
  const f = useCurrentFrame();
  const btn = useSpring(cue("estudio", 50) - 6, 14);
  const urlAt = cue("estudio", 50);
  const url = interpolate(f, [urlAt, urlAt + 16], [0, 1], clamp);
  const pulseFrom = urlAt + 30;
  const pulse = f > pulseFrom ? 1 + Math.max(0, Math.sin((f - pulseFrom) / 9)) * 0.025 : 1;
  const subAt = cue("prueba", 110);
  return (
    <AbsoluteFill style={{ background: C.accent }}>
      <AbsoluteFill style={{ padding: PAD, justifyContent: "space-between", opacity: interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" }) }}>
        <Wordmark size={40} onAccent />
        <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
          <div style={{ ...display, fontSize: 128, color: C.ink, whiteSpace: "nowrap" }}>
            <Words text="Reserva una llamada" start={cue("Reserva", 8) - 2} />
            <br />
            <Words text="de 20 minutos." start={cue("veinte", 22) - 4} />
          </div>
          <div style={{ ...serif, fontSize: 42, color: C.ink, maxWidth: 1200 }}>
            <Words text="Primer mes de gestión gratis. Solo pagas la publicidad." start={subAt - 2} step={2.2} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div
            style={{
              ...sans,
              fontSize: 36,
              fontWeight: 600,
              background: C.ink,
              color: C.paper,
              padding: "28px 40px",
              transform: `scale(${(0.85 + btn * 0.15) * pulse})`,
              opacity: btn,
              transformOrigin: "left center",
            }}
          >
            Elegir día y hora →
          </div>
          <div style={{ ...mono, fontSize: 30, color: C.ink, opacity: url }}>estudiodigitalpro.com/llamada</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
