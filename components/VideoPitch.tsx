"use client";

import { useRef, useState } from "react";
import { Scale } from "./Scale";
import { trackEvent } from "@/lib/tracking-client";

/**
 * Hueco del vídeo de venta. Sin `src` muestra un placeholder de marca;
 * con `src`, portada propia + reproductor nativo al pulsar.
 */
export function VideoPitch({ src, poster, duration }: { src?: string; poster?: string; duration?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  if (!src) {
    return (
      <div className="vp vp-placeholder" role="img" aria-label="Espacio reservado para el vídeo">
        <Scale score={5} size={28} gap={5} label="" />
        <p className="mono">Vídeo · 16:9</p>
      </div>
    );
  }

  return (
    <div className={`vp ${playing ? "is-playing" : ""}`}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        preload="metadata"
        playsInline
        controls={playing}
        onEnded={() => setPlaying(false)}
      >
        <track kind="captions" src="/video/edp-llamada.vtt" srcLang="es" label="Español" default />
      </video>
      {!playing && (
        <button
          type="button"
          className="vp-play"
          onClick={() => {
            setPlaying(true);
            ref.current?.play();
            trackEvent("WatchVideo", { content_name: "Vídeo pitch 38s", duration });
          }}
          aria-label="Reproducir el vídeo"
        >
          <span className="vp-btn" aria-hidden>
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
            </svg>
          </span>
          <span className="vp-label">
            Mira cómo funciona{duration && <span className="mono"> · {duration}</span>}
          </span>
        </button>
      )}
    </div>
  );
}
