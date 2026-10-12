"""
Genera la locución del vídeo a partir de video/voice/script.json.

  python scripts/voice.py              # locución completa
  python scripts/voice.py --muestras   # misma frase con varias voces (out/voces/) para elegir

Todo el guion se locuta en UNA sola toma (entonación continua, como una persona
hablando) y luego se corta en frases por los silencios entre ellas. Cada frase
guarda el instante exacto de cada palabra: el vídeo saca el texto cuando se dice.

Proveedor (el primero disponible; claves en el entorno o en .env):
  - ElevenLabs  → ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID   (la más natural)
  - OpenAI      → OPENAI_API_KEY (+ OPENAI_TTS_VOICE)        (sin marcas por palabra: se estiman)
  - edge-tts    → gratis, sin clave (pip install edge-tts)

Salida: public/voice/<id>.wav + public/voice/manifest.json
"""

import asyncio
import base64
import json
import os
import re
import subprocess
import sys
import unicodedata
import urllib.request
import wave
from pathlib import Path

import numpy as np

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

VIDEO = Path(__file__).resolve().parents[1]
OUT = VIDEO / "public" / "voice"
SCRIPT = json.loads((VIDEO / "voice" / "script.json").read_text(encoding="utf-8"))
SR = 48000


def load_env():
    """Lee ELEVENLABS_* / OPENAI_* de video/.env o del .env de la web si no están ya en el entorno."""
    for env in (VIDEO / ".env", VIDEO.parent / ".env", VIDEO.parent / ".env.local"):
        if not env.exists():
            continue
        for line in env.read_text(encoding="utf-8").splitlines():
            k, _, v = line.partition("=")
            k = k.strip()
            if k.startswith(("ELEVENLABS_", "OPENAI_")) and v.strip() and not os.environ.get(k):
                os.environ[k] = v.strip().strip('"').strip("'")


load_env()


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in s if unicodedata.category(c) != "Mn"))


def decode(src: Path) -> np.ndarray:
    """Cualquier audio → mono 48 kHz float."""
    tmp = src.with_suffix(".tmp.wav")
    cmd = ["npx", "remotion", "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(src), "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", "-y", str(tmp)]
    subprocess.run(cmd, cwd=VIDEO, check=True, shell=os.name == "nt")
    with wave.open(str(tmp)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64) / 32768
    tmp.unlink()
    return x


def write_wav(path: Path, x: np.ndarray):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


# ── Proveedores: devuelven [{text, start, end}] en segundos ──


async def edge(text: str, path: Path, voice: str | None = None):
    import edge_tts

    v = SCRIPT["voice"]
    # El servicio gratuito devuelve 403 de forma intermitente: se reintenta.
    for attempt in range(8):
        try:
            com = edge_tts.Communicate(text, voice or v["edge"], rate=v.get("rate", "+0%"), pitch=v.get("pitch", "+0Hz"), boundary="WordBoundary")
            words = []
            with open(path, "wb") as f:
                async for chunk in com.stream():
                    if chunk["type"] == "audio":
                        f.write(chunk["data"])
                    elif chunk["type"] == "WordBoundary":
                        s = chunk["offset"] / 1e7
                        words.append({"text": chunk["text"], "start": s, "end": s + chunk["duration"] / 1e7})
            return words
        except Exception as e:
            if attempt == 7:
                raise
            print(f"  reintento ({type(e).__name__})")
            await asyncio.sleep(2 + attempt)


def elevenlabs(text: str, path: Path):
    voice = os.environ.get("ELEVENLABS_VOICE_ID")
    if not voice:
        sys.exit("Falta ELEVENLABS_VOICE_ID: elige en la Voice Library una voz nativa de España (filtro Spanish · Spain) y pon su ID en .env.")
    body = {
        "text": text,
        "model_id": os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2"),
        "language_code": "es",
        # Estabilidad media-baja = más expresiva; style suave para que no suene a locutor de anuncio.
        "voice_settings": {"stability": 0.4, "similarity_boost": 0.8, "style": 0.2, "use_speaker_boost": True, "speed": 1.05},
    }
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_192",
        data=json.dumps(body).encode(),
        headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"},
    )
    res = json.loads(urllib.request.urlopen(req).read())
    path.write_bytes(base64.b64decode(res["audio_base64"]))
    a = res["alignment"]
    words, cur = [], None
    for ch, s, e in zip(a["characters"], a["character_start_times_seconds"], a["character_end_times_seconds"]):
        if ch.isspace():
            cur = None
            continue
        if cur is None:
            cur = {"text": "", "start": s, "end": e}
            words.append(cur)
        cur["text"] += ch
        cur["end"] = e
    return [w for w in words if norm(w["text"])]


def openai(text: str, path: Path):
    req = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=json.dumps(
            {
                "model": "gpt-4o-mini-tts",
                "voice": os.environ.get("OPENAI_TTS_VOICE", SCRIPT["voice"].get("openai", "ash")),
                "input": text,
                "instructions": SCRIPT["voice"].get("instructions", ""),
                "response_format": "mp3",
            }
        ).encode(),
        headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}", "Content-Type": "application/json"},
    )
    path.write_bytes(urllib.request.urlopen(req).read())
    return []  # sin marcas: se estiman tras decodificar


def provider():
    if os.environ.get("ELEVENLABS_API_KEY"):
        return "elevenlabs"
    if os.environ.get("OPENAI_API_KEY"):
        return "openai"
    return "edge"


def estimate_words(text: str, x: np.ndarray):
    """Sin marcas del proveedor: reparte las palabras por longitud sobre la parte con sonido."""
    loud = np.flatnonzero(np.abs(x) > 0.02)
    a, b = (loud[0] / SR, loud[-1] / SR) if len(loud) else (0, len(x) / SR)
    toks = [t for t in text.split() if norm(t)]
    total = sum(len(norm(t)) + 2 for t in toks)
    words, t = [], a
    for tok in toks:
        d = (b - a) * (len(norm(tok)) + 2) / total
        words.append({"text": tok, "start": t, "end": t + d * 0.85})
        t += d
    return words


# ── Corte en frases ───────────────────────────


def split(segs, words, x):
    """Asigna palabras a frases (por letras) y corta la toma en el silencio entre frases."""
    groups, i = [], 0
    for seg in segs:
        need, got, g = len(norm(seg["text"])), 0, []
        while i < len(words) and got < need:
            got += len(norm(words[i]["text"]))
            g.append(words[i])
            i += 1
        if not g:
            sys.exit(f"No hay palabras para «{seg['id']}»: revisa el guion.")
        groups.append(g)

    clips = []
    for n, (seg, g) in enumerate(zip(segs, groups)):
        a = g[0]["start"] - 0.06 if n == 0 else (groups[n - 1][-1]["end"] + g[0]["start"]) / 2
        b = (g[-1]["end"] + groups[n + 1][0]["start"]) / 2 if n + 1 < len(groups) else g[-1]["end"] + 0.3
        ia, ib = max(0, int(a * SR)), min(len(x), int(b * SR))
        clip = x[ia:ib]
        # Recorta el silencio de cabeza y cola (deja 25 ms delante y 90 ms detrás).
        loud = np.flatnonzero(np.abs(clip) > 0.015)
        h = max(0, loud[0] - int(0.025 * SR)) if len(loud) else 0
        t = min(len(clip), loud[-1] + int(0.09 * SR)) if len(loud) else len(clip)
        clip = clip[h:t]
        t0 = (ia + h) / SR
        ws = [{"text": w["text"], "start": max(0, w["start"] - t0), "end": max(0, w["end"] - t0)} for w in g]
        clip, ws = squeeze(clip, ws)
        for w in ws:
            w["start"], w["end"] = round(w["start"], 3), round(w["end"], 3)
        clips.append({"seg": seg, "audio": clip, "words": ws})
    return clips


def squeeze(clip: np.ndarray, words, longest=0.4, keep=0.28):
    """Acorta las pausas internas largas (los TTS se paran demasiado tras «?» y «.») y corrige las marcas."""
    win = int(0.01 * SR)
    n = len(clip) // win
    if n == 0:
        return clip, words
    rms = np.sqrt((clip[: n * win].reshape(n, win) ** 2).mean(axis=1))
    silent = rms < 0.01
    cuts, i = [], 0
    while i < n:
        if silent[i]:
            j = i
            while j < n and silent[j]:
                j += 1
            if (j - i) * 0.01 > longest and i > 0 and j < n:
                # Se quita el centro de la pausa: quedan `keep` segundos repartidos a los lados.
                a = (i * win) + int(keep / 2 * SR)
                b = (j * win) - int(keep / 2 * SR)
                cuts.append((a, b))
            i = j
        else:
            i += 1
    if not cuts:
        return clip, words
    parts, last = [], 0
    for a, b in cuts:
        parts.append(clip[last:a])
        last = b
    parts.append(clip[last:])
    out = np.concatenate(parts)

    def shift(t):
        s = t * SR
        removed = sum(min(b, max(a, s)) - a for a, b in cuts)
        return (s - removed) / SR

    return out, [{**w, "start": shift(w["start"]), "end": shift(w["end"])} for w in words]


async def take(prov: str, text: str, path: Path):
    if prov == "edge":
        return await edge(text, path)
    if prov == "elevenlabs":
        return elevenlabs(text, path)
    return openai(text, path)


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    prov = provider()
    segs = SCRIPT["segments"]
    print(f"Proveedor de voz: {prov}")

    # Una sola toma con todo el guion.
    raw = OUT / "_take.mp3"
    words = await take(prov, " ".join(s["text"] for s in segs), raw)
    x = decode(raw)
    raw.unlink()
    if not words:
        # OpenAI: se locuta frase a frase y se estiman las palabras.
        x_parts, words, t = [], [], 0.0
        for s in segs:
            p = OUT / f"_{s['id']}.mp3"
            await take(prov, s["text"], p)
            xs = decode(p)
            p.unlink()
            words += [{**w, "start": w["start"] + t, "end": w["end"] + t} for w in estimate_words(s["text"], xs)]
            x_parts.append(xs)
            t += len(xs) / SR
        x = np.concatenate(x_parts)

    # Ganancia común: RMS objetivo -18 dB con techo de pico -1 dB.
    voiced = x[np.abs(x) > 0.01]
    rms = np.sqrt((voiced**2).mean()) if len(voiced) else 1e-3
    x = x * min(10 ** (-18 / 20) / rms, 10 ** (-1 / 20) / (np.abs(x).max() + 1e-9))

    manifest = {"provider": prov, "voice": SCRIPT["voice"].get(prov, os.environ.get("ELEVENLABS_VOICE_ID", "")), "segments": []}
    for c in split(segs, words, x):
        seg = c["seg"]
        write_wav(OUT / f"{seg['id']}.wav", c["audio"])
        dur = len(c["audio"]) / SR
        manifest["segments"].append({"id": seg["id"], "scene": seg.get("scene", seg["id"]), "file": f"voice/{seg['id']}.wav", "duration": round(dur, 3), "words": c["words"]})
        print(f"  {seg['id']:<8} {dur:5.2f} s  {seg['text']}")
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Locución: {sum(s['duration'] for s in manifest['segments']):.1f} s → {OUT / 'manifest.json'}")


async def samples():
    """Misma frase con varias voces gratuitas, para elegir de oído."""
    dst = VIDEO / "out" / "voces"
    dst.mkdir(parents=True, exist_ok=True)
    text = " ".join(s["text"] for s in SCRIPT["segments"][:3])
    for v in SCRIPT["voice"].get("candidates", [SCRIPT["voice"]["edge"]]):
        await edge(text, dst / f"{v}.mp3", v)
        print(f"  {dst / (v + '.mp3')}")


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(samples() if "--muestras" in sys.argv else main())
