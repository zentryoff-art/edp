"use client";

import { useEffect, useState } from "react";

/** Palabras que se relevan en el mismo hueco. Decorativo: el texto accesible va aparte. */
export function WordRotator({ words, interval = 2400 }: { words: string[]; interval?: number }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);

  return (
    <span className="wr" aria-hidden>
      {words.map((w, k) => (
        <span key={w} className={`wr-word ${k === i ? "is-in" : k === (i - 1 + words.length) % words.length ? "is-out" : ""}`}>
          {w}
        </span>
      ))}
    </span>
  );
}
