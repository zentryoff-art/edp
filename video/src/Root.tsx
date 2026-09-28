import React from "react";
import { AbsoluteFill, Audio, Composition, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import manifest from "../public/voice/manifest.json";
import { Fonts } from "./parts";
import { Brand, Capture, Cost, Cta, Honest, Hook, Problem, Qualify, Report, Result, type SceneProps } from "./scenes";
import { FPS } from "./theme";

/** Margen antes de que empiece a hablar y después de terminar (fotogramas). */
const LEAD = 8;
const TAIL = 16;

/** Guion visual. Cada escena dura lo que su locución (con un mínimo). */
const SCENES: { id: string; C: React.FC<SceneProps>; min: number }[] = [
  { id: "hook", C: Hook, min: 150 },
  { id: "problem", C: Problem, min: 200 },
  { id: "cost", C: Cost, min: 150 },
  { id: "brand", C: Brand, min: 150 },
  { id: "capture", C: Capture, min: 140 },
  { id: "qualify", C: Qualify, min: 150 },
  { id: "report", C: Report, min: 140 },
  { id: "result", C: Result, min: 160 },
  { id: "honest", C: Honest, min: 110 },
  { id: "cta", C: Cta, min: 240 },
];

type Seg = (typeof manifest.segments)[number];
const byId = new Map<string, Seg>(manifest.segments.map((s) => [s.id, s]));

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

const PLAN = SCENES.map((s) => {
  const seg = byId.get(s.id);
  const voiceFrames = seg ? Math.ceil(seg.duration * FPS) : 0;
  const d = Math.max(s.min, LEAD + voiceFrames + TAIL);
  /** Fotograma (dentro de la escena) en que se dice `word`. */
  const cue = (word: string, fallback = 0) => {
    const w = seg?.words.find((x) => norm(x.text) === norm(word));
    return w ? LEAD + Math.round(w.start * FPS) : fallback;
  };
  return { ...s, seg, d, cue };
});

const TOTAL = PLAN.reduce((a, s) => a + s.d, 0);

const Music: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  return (
    <Audio
      src={staticFile("music/bed.wav")}
      volume={(f) =>
        interpolate(f, [0, 20, durationInFrames - 50, durationInFrames - 2], [0, 0.2, 0.2, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
  );
};

const EdpConversion: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "#F8F7F4" }}>
      <Fonts />
      <Music />
      {PLAN.map(({ id, C, d, cue, seg }) => {
        const node = (
          <Sequence key={id} from={from} durationInFrames={d} name={id}>
            <C d={d} cue={cue} />
            {seg && (
              <Sequence from={LEAD}>
                <Audio src={staticFile(seg.file)} volume={1} />
              </Sequence>
            )}
          </Sequence>
        );
        from += d;
        return node;
      })}
    </AbsoluteFill>
  );
};

/** Portada del vídeo: la escena de marca; se renderiza su último fotograma (--frame=-1). */
const brandPlan = PLAN.find((p) => p.id === "brand")!;
const POSTER_FRAMES = brandPlan.d - 12;

const EdpPoster: React.FC = () => (
  <AbsoluteFill>
    <Fonts />
    <brandPlan.C d={brandPlan.d} cue={brandPlan.cue} />
  </AbsoluteFill>
);

export const Root: React.FC = () => (
  <>
    <Composition id="EdpConversion" component={EdpConversion} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
    <Composition id="EdpPoster" component={EdpPoster} durationInFrames={POSTER_FRAMES} fps={FPS} width={1920} height={1080} />
  </>
);
