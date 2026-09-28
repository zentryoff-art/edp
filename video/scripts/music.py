"""
Base musical propia para el vídeo (sin derechos de terceros), sintetizada con numpy.

  python video/scripts/music.py

Salida: video/public/music/bed.wav (estéreo, 44.1 kHz, ~120 s).
Estilo: tech minimal, 96 BPM, La menor (Am–F–C–G), pad + bajo + arpegio + ritmo suave.
"""

import wave
from pathlib import Path

import numpy as np

SR = 44100
BPM = 96
BEAT = 60 / BPM
BAR = 4 * BEAT
BARS = 48  # 48 compases ≈ 120 s
N = int(BARS * BAR * SR) + SR * 3
OUT = Path(__file__).resolve().parents[1] / "public" / "music" / "bed.wav"
rng = np.random.default_rng(7)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


# Acordes (MIDI) de un compás cada uno: Am, F, C, G
CHORDS = [
    [57, 60, 64, 69],  # Am
    [53, 57, 60, 65],  # F
    [48, 55, 60, 64],  # C
    [55, 59, 62, 67],  # G
]
ROOTS = [45, 41, 48, 43]


def env_adsr(n, a, d, s, r):
    e = np.ones(n) * s
    A, D, R = int(a * SR), int(d * SR), int(r * SR)
    A = min(A, n)
    e[:A] = np.linspace(0, 1, A)
    D = min(D, n - A)
    e[A : A + D] = np.linspace(1, s, D)
    if R > 0 and R < n:
        e[-R:] *= np.linspace(1, 0, R)
    return e


def saw_soft(f, t, harmonics=7):
    """Diente de sierra con pocos armónicos (suave, sin aliasing)."""
    out = np.zeros_like(t)
    for k in range(1, harmonics + 1):
        out += np.sin(2 * np.pi * f * k * t) / (k ** 1.6)
    return out


def add(buf, sig, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:j, 0] += sig[: j - i] * gain * l
    buf[i:j, 1] += sig[: j - i] * gain * r


mix = np.zeros((N, 2))

for bar in range(BARS):
    t0 = bar * BAR
    chord = CHORDS[bar % 4]
    root = ROOTS[bar % 4]
    section = 0 if bar < 4 else 1 if bar < 8 else 2  # intro · build · main

    # Pad: acorde sostenido con ligero desafinado entre canales
    n = int(BAR * SR * 1.15)
    t = np.arange(n) / SR
    e = env_adsr(n, 0.35, 0.6, 0.8, 0.5)
    for m in chord:
        for det, pan in ((-0.08, -0.6), (0.08, 0.6)):
            add(mix, saw_soft(hz(m) * (1 + det / 100), t) * e, t0, 0.028, pan)

    # Bajo: corcheas con envolvente corta
    if section >= 1:
        for k in range(8):
            if k in (3, 7) and section == 1:
                continue
            nb = int(BEAT / 2 * SR)
            tb = np.arange(nb) / SR
            s = np.sin(2 * np.pi * hz(root - 12) * tb) + 0.25 * np.sin(2 * np.pi * hz(root) * tb)
            add(mix, s * env_adsr(nb, 0.005, 0.12, 0.35, 0.05), t0 + k * BEAT / 2, 0.16)

    # Arpegio: semicorcheas por las notas del acorde, una octava arriba, con eco
    if section >= 1:
        pattern = [0, 2, 1, 3, 2, 1, 3, 2]
        for k in range(16):
            if section == 1 and k % 2:
                continue
            m = chord[pattern[k % 8]] + 12
            na = int(0.45 * SR)
            ta = np.arange(na) / SR
            s = (np.sin(2 * np.pi * hz(m) * ta) + 0.3 * np.sin(2 * np.pi * hz(m) * 2 * ta)) * np.exp(-ta * 9)
            pan = -0.35 if k % 2 else 0.35
            start = t0 + k * BEAT / 4
            add(mix, s, start, 0.05, pan)
            add(mix, s, start + BEAT * 0.75, 0.018, -pan)  # eco

    # Ritmo: bombo a negras y hi-hat en contratiempo (solo sección principal)
    if section == 2:
        for k in range(4):
            nk = int(0.35 * SR)
            tk = np.arange(nk) / SR
            f = 45 + 75 * np.exp(-tk * 30)
            kick = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tk * 9)
            add(mix, kick, t0 + k * BEAT, 0.3)
            nh = int(0.05 * SR)
            hat = np.diff(rng.standard_normal(nh + 1)) * np.exp(-np.arange(nh) / SR * 90)
            add(mix, hat, t0 + k * BEAT + BEAT / 2, 0.012, 0.25)

# Reverb: convolución con una respuesta al impulso sintética
ir_len = int(2.2 * SR)
tir = np.arange(ir_len) / SR
ir = rng.standard_normal((ir_len, 2)) * np.exp(-tir * 3.2)[:, None]
ir[:, 1] = np.roll(ir[:, 1], 211)
size = 1 << int(np.ceil(np.log2(N + ir_len)))
wet = np.zeros_like(mix)
for ch in range(2):
    wet[:, ch] = np.fft.irfft(np.fft.rfft(mix[:, ch], size) * np.fft.rfft(ir[:, ch], size), size)[:N]
wet /= np.max(np.abs(wet)) + 1e-9
dry = mix / (np.max(np.abs(mix)) + 1e-9)
out = dry * 0.8 + wet * 0.25

# Fundidos y normalización a -1 dBFS
fade_in = int(2.5 * SR)
out[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
fade_out = int(3 * SR)
out[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
out *= 10 ** (-1 / 20) / (np.max(np.abs(out)) + 1e-9)

OUT.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(OUT), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out * 32767).astype("<i2").tobytes())
print(f"Música: {OUT} ({len(out) / SR:.1f} s)")
