"""
Genera la locución del vídeo a partir de video/voice/script.json.

  python video/scripts/voice.py

Proveedor (el primero disponible):
  - ElevenLabs  → ELEVENLABS_API_KEY (+ ELEVENLABS_VOICE_ID opcional)
  - OpenAI      → OPENAI_API_KEY (+ OPENAI_TTS_VOICE opcional)
  - edge-tts    → gratis, sin clave (pip install edge-tts)

Salida: video/public/voice/<id>.mp3 y video/public/voice/manifest.json con la
duración de cada frase y, cuando el proveedor lo da, el instante de cada palabra.
"""

import asyncio
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

VIDEO = Path(__file__).resolve().parents[1]
OUT = VIDEO / "public" / "voice"
SCRIPT = json.loads((VIDEO / "voice" / "script.json").read_text(encoding="utf-8"))


def normalize(src: Path, dst: Path, target_rms_db=-18.0, ceiling_db=-1.0):
    """Decodifica a WAV y ajusta la ganancia: RMS objetivo con techo de pico."""
    import wave

    import numpy as np

    tmp = dst.with_suffix(".raw.wav")
    cmd = ["npx", "remotion", "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(src), "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", "-y", str(tmp)]
    subprocess.run(cmd, cwd=VIDEO, check=True, shell=os.name == "nt")
    with wave.open(str(tmp)) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64) / 32768
    tmp.unlink()
    voiced = x[np.abs(x) > 0.01]
    rms = np.sqrt((voiced**2).mean()) if len(voiced) else 1e-3
    gain = min(10 ** (target_rms_db / 20) / rms, 10 ** (ceiling_db / 20) / (np.abs(x).max() + 1e-9))
    y = np.clip(x * gain, -1, 1)
    with wave.open(str(dst), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((y * 32767).astype("<i2").tobytes())


def duration(path: Path) -> float:
    cmd = ["npx", "remotion", "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)]
    r = subprocess.run(cmd, cwd=VIDEO, capture_output=True, text=True, shell=os.name == "nt")
    return float(r.stdout.strip().splitlines()[-1])


# ── Proveedores ───────────────────────────────


async def edge(text: str, path: Path):
    import edge_tts

    v = SCRIPT["voice"]
    com = edge_tts.Communicate(text, v["edge"], rate=v.get("rate", "+0%"), pitch=v.get("pitch", "+0Hz"), boundary="WordBoundary")
    words = []
    with open(path, "wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({"text": chunk["text"], "start": round(chunk["offset"] / 1e7, 3)})
    return words


def elevenlabs(text: str, path: Path):
    voice = os.environ.get("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128",
        data=json.dumps({"text": text, "model_id": "eleven_multilingual_v2", "voice_settings": {"stability": 0.45, "similarity_boost": 0.8}}).encode(),
        headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"},
    )
    path.write_bytes(urllib.request.urlopen(req).read())
    return []


def openai(text: str, path: Path):
    req = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=json.dumps({"model": "gpt-4o-mini-tts", "voice": os.environ.get("OPENAI_TTS_VOICE", "onyx"), "input": text, "response_format": "mp3"}).encode(),
        headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}", "Content-Type": "application/json"},
    )
    path.write_bytes(urllib.request.urlopen(req).read())
    return []


def provider():
    if os.environ.get("ELEVENLABS_API_KEY"):
        return "elevenlabs"
    if os.environ.get("OPENAI_API_KEY"):
        return "openai"
    return "edge"


# ── Main ──────────────────────────────────────


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    prov = provider()
    print(f"Proveedor de voz: {prov}")
    manifest = {"provider": prov, "segments": []}
    for seg in SCRIPT["segments"]:
        path = OUT / f"{seg['id']}.mp3"
        if prov == "edge":
            words = await edge(seg["text"], path)
        elif prov == "elevenlabs":
            words = elevenlabs(seg["text"], path)
        else:
            words = openai(seg["text"], path)
        wav = OUT / f"{seg['id']}.wav"
        normalize(path, wav)
        path.unlink()
        path = wav
        dur = duration(path)
        if not words:
            # Sin marcas de tiempo: se reparten las palabras a lo largo de la frase.
            toks = seg["text"].split()
            words = [{"text": t.strip(".,:;¿?¡!"), "start": round(dur * i / len(toks), 3)} for i, t in enumerate(toks)]
        manifest["segments"].append({"id": seg["id"], "file": f"voice/{seg['id']}.wav", "duration": round(dur, 3), "words": words})
        print(f"  {seg['id']:<8} {dur:5.2f} s")
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    total = sum(s["duration"] for s in manifest["segments"])
    print(f"Locución total: {total:.1f} s → {OUT / 'manifest.json'}")


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
