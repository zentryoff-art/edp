import React from "react";
import { AbsoluteFill, Audio, Composition, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import manifest from "../public/voice/manifest.json";
import { OVERLAP } from "./kit";
import { Fonts } from "./parts";
import { Agency, Blind, Cta, Hook, Jorge, Offer, Panel, Silence, Trial, Turn, type Cue, type SceneProps } from "./scenes";
import { FPS } from "./theme";

/**
 * Guion visual a 30 fps. Manda la voz: cada escena dura lo que su frase (más lo
 * que necesiten sus animaciones) y cada texto entra cuando se dice. Sin locución,
 * se usan `d` y los fotogramas de reserva de cada escena.
 *
 *  d     duración sin voz
 *  hold  fotogramas que la escena aguanta tras acabar su frase
 *  need  duración mínima según sus marcas (para lo que se anima después de hablar)
 *  beat  separación mínima entre frases dentro de la escena (planos del panel)
 */
const SCENES: { id: string; C: React.FC<SceneProps>; d: number; hold?: number; beat?: number; need?: (cue: Cue) => number }[] = [
  { id: "hook", C: Hook, d: 96, need: (c) => c("basura", 22) + 46 },
  { id: "agency", C: Agency, d: 90, need: (c) => c("Ni", 54) + 16 },
  { id: "blind", C: Blind, d: 90, need: (c) => c("sabes", 50) + 18 },
  { id: "silence", C: Silence, d: 96 },
  { id: "turn", C: Turn, d: 84, need: (c) => c("cierras", 50) + 18 },
  { id: "trial", C: Trial, d: 96, need: (c) => c("nosotros", 62) + 18 },
  { id: "panel", C: Panel, d: 300, beat: 60, hold: 24 },
  { id: "jorge", C: Jorge, d: 78, need: (c) => c("Jorge", 20) + 36 },
  { id: "offer", C: Offer, d: 96, need: (c) => c("riesgo", 58) + 22 },
  { id: "cta", C: Cta, d: 150, hold: 60 },
];

type Word = { text: string; start: number; end: number };
type Voice = { id: string; file: string; duration: number; scene?: string; words?: Word[] };
type Clip = Voice & { scene: string; words: Word[]; at: number };
const VOICE = (manifest.segments as Voice[]).map((v) => ({ ...v, scene: v.scene ?? v.id, words: v.words ?? [] }));

/** La voz entra cuando la cortina ya ha descubierto la escena. */
const VOICE_LEAD = 4;
/** El texto aparece unos fotogramas antes de oírse: se lee y se oye a la vez. */
const TEXT_LEAD = 3;
/** Respiro mínimo entre frases dentro de una escena. */
const BEAT_GAP = 4;
/** Aguante por defecto tras la frase: la voz siguiente entra en d - OVERLAP + VOICE_LEAD. */
const HOLD = 9;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

type Planned = (typeof SCENES)[number] & { from: number; cue: Cue; starts?: number[]; clips: Clip[] };

const PLAN = SCENES.reduce<Planned[]>((acc, s) => {
  const prev = acc[acc.length - 1];
  const clips: Clip[] = [];
  let end = 0;
  for (const v of VOICE.filter((x) => x.scene === s.id)) {
    const last = clips[clips.length - 1];
    const at = last ? Math.max(end + BEAT_GAP, last.at + (s.beat ?? 0)) : VOICE_LEAD;
    clips.push({ ...v, at });
    end = at + Math.ceil(v.duration * FPS);
  }
  const words = clips.flatMap((v) => v.words.map((w) => ({ n: norm(w.text), f: v.at + Math.round(w.start * FPS) })));
  const cue: Cue = (word, fallback, nth = 0) => {
    if (!clips.length) return fallback;
    const hits = words.filter((w) => w.n === norm(word));
    const hit = hits[nth] ?? hits[0];
    if (!hit) console.warn(`[voz] «${word}» no aparece en la locución de ${s.id}`);
    return hit ? Math.max(0, hit.f - TEXT_LEAD) : fallback;
  };
  const d = clips.length ? Math.max(end + (s.hold ?? HOLD), s.need?.(cue) ?? 0) : s.d;
  acc.push({ ...s, d, cue, clips, starts: clips.length ? clips.map((c) => c.at) : undefined, from: prev ? prev.from + prev.d - OVERLAP : 0 });
  return acc;
}, []);

const TOTAL = PLAN[PLAN.length - 1].from + PLAN[PLAN.length - 1].d;

/** Con voz, la música baja para no competir con ella. */
const MUSIC = VOICE.length ? 0.09 : 0.32;

const Music: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  return (
    <Audio
      src={staticFile("music/bed.wav")}
      volume={(f) =>
        interpolate(f, [0, 4, durationInFrames - 24, durationInFrames - 2], [0, MUSIC, MUSIC, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
  );
};

const EdpConversion: React.FC = () => (
  <AbsoluteFill style={{ background: "#F8F7F4" }}>
    <Fonts />
    <Music />
    {PLAN.map(({ id, C, d, from, cue, starts }) => (
      <Sequence key={id} from={from} durationInFrames={d} name={id}>
        <C d={d} cue={cue} starts={starts} />
      </Sequence>
    ))}
    {PLAN.flatMap(({ from, clips }) =>
      clips.map((v) => (
        <Sequence key={v.id} from={from + v.at} layout="none" name={`voz ${v.id}`}>
          <Audio src={staticFile(v.file)} />
        </Sequence>
      )),
    )}
  </AbsoluteFill>
);

/** Portada: el gancho con todo en pantalla (se renderiza su último fotograma con --frame=-1). */
const hook = PLAN[0];
const POSTER_FRAMES = hook.d - OVERLAP - 2;

const EdpPoster: React.FC = () => (
  <AbsoluteFill>
    <Fonts />
    <hook.C d={hook.d} cue={hook.cue} />
  </AbsoluteFill>
);

export const Root: React.FC = () => (
  <>
    <Composition id="EdpConversion" component={EdpConversion} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
    <Composition id="EdpPoster" component={EdpPoster} durationInFrames={POSTER_FRAMES} fps={FPS} width={1920} height={1080} />
  </>
);
