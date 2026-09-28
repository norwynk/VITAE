"""Synthesized soundtrack for the OSW stop-motion film.

A warm ambient pad (90 bpm, one chord per scene), a soft marimba arpeggio under the
Test / Plan / Deliver section, and foley-style hits (paper taps, card placements,
thumps, whooshes, a closing chime) driven by the animation's own events.
"""
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
BEAT = 60 / 90  # seconds


def _t(d):
    return np.arange(int(d * SR)) / SR


def _add(buf, sig, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    n = min(len(sig), len(buf) - i)
    buf[i:i + n] += sig[:n] * gain


def _bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "bandpass", fs=SR, output="sos"), x)


def _lp(x, hi, order=2):
    return sosfilt(butter(order, hi, "lowpass", fs=SR, output="sos"), x)


def _reverb(x, seconds=2.4, seed=3):
    rng = np.random.default_rng(seed)
    t = _t(seconds)
    ir = rng.normal(0, 1, len(t)) * np.exp(-t * 3.2)
    ir = _lp(ir, 6000)
    ir /= np.sqrt(np.sum(ir**2))
    return fftconvolve(x, ir)[:len(x)]


NOTE = {n: 440 * 2 ** ((i - 9) / 12 + o - 4)
        for o in range(1, 7)
        for i, n0 in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])
        for n in [f"{n0}{o}"]}

# (start_s, chord) — boundaries match the scene cuts in render.py
CHORDS = [
    (0.0, ["D3", "A3", "F#4", "C#5", "E5"]),       # Dmaj9     logo + headline
    (4.0, ["B2", "F#3", "D4", "A4", "E5"]),        # Bm(add11) the woman
    (6.333, ["G2", "D3", "B3", "F#4", "A4"]),      # Gmaj9     test
    (8.0, ["E2", "B2", "G3", "D4", "F#4"]),        # Em9       plan
    (9.667, ["A2", "E3", "B3", "E4", "C#5"]),      # Asus      deliver
    (11.333, ["G2", "D3", "B3", "F#4", "A4"]),     # Gmaj9     lockup
    (13.0, ["D3", "A3", "F#4", "C#5", "E5"]),      # Dmaj9     end card
]


def pad(dur):
    out = np.zeros(int(dur * SR))
    for k, (start, notes) in enumerate(CHORDS):
        end = CHORDS[k + 1][0] if k + 1 < len(CHORDS) else dur
        seg = end - start + 0.6
        t = _t(seg)
        env = np.minimum(1, t / 0.35) * np.minimum(1, np.maximum(0, (seg - t) / 0.6))
        s = np.zeros_like(t)
        for n in notes:
            f = NOTE[n]
            for det in (-0.12, 0.0, 0.13):
                ph = np.random.default_rng(int(f)).uniform(0, 6.28)
                s += np.sin(2 * np.pi * f * (1 + det / 100) * t + ph)
                s += 0.18 * np.sin(2 * np.pi * 2 * f * (1 + det / 100) * t)
        s *= env * (0.75 + 0.25 * np.sin(2 * np.pi * 0.18 * t))
        _add(out, s / 18, start)
    return _lp(out, 2400)


def mallet(f, d=1.2):
    t = _t(d)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 5)
            + 0.25 * np.sin(2 * np.pi * 3.99 * f * t) * np.exp(-t * 22)
            + 0.08 * np.sin(2 * np.pi * 10.1 * f * t) * np.exp(-t * 60))


def arp(dur):
    out = np.zeros(int(dur * SR))
    eighth = BEAT / 2
    pattern = [0, 2, 4, 3, 1, 3, 4, 2]
    t = 6.333
    i = 0
    while t < 12.9:
        chord = [c for s, c in CHORDS if s <= t + 1e-3][-1]
        n = chord[pattern[i % 8]]
        f = NOTE[n] * (2 if NOTE[n] < 300 else 1)
        accent = 1.0 if i % 4 == 0 else 0.65
        _add(out, mallet(f), t, 0.10 * accent)
        t += eighth
        i += 1
    return out


def tap(seed, bright=1.0):
    rng = np.random.default_rng(seed)
    t = _t(0.09)
    n = rng.normal(0, 1, len(t)) * np.exp(-t * 180)
    n = _bp(n, 1400 * bright, 6500)
    body = np.sin(2 * np.pi * rng.uniform(170, 230) * t) * np.exp(-t * 70) * 0.5
    return n * 0.9 + body


def place_sound(seed):
    rng = np.random.default_rng(seed)
    t = _t(0.18)
    n = _bp(rng.normal(0, 1, len(t)), 300, 2500) * np.exp(-t * 45)
    body = np.sin(2 * np.pi * 110 * t) * np.exp(-t * 35)
    return 0.6 * n + 0.7 * body


def thump():
    t = _t(0.7)
    f = 48 + 60 * np.exp(-t * 25)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 6)


def whoosh(seed):
    rng = np.random.default_rng(seed)
    d = 0.32
    t = _t(d)
    n = rng.normal(0, 1, len(t))
    env = np.sin(np.pi * np.minimum(1, t / d)) ** 2
    return _bp(n, 400, 3200) * env


def swish(seed):
    rng = np.random.default_rng(seed)
    t = _t(0.22)
    env = (t / 0.22) ** 2 * np.exp(-np.maximum(0, t - 0.18) * 80)
    return _bp(rng.normal(0, 1, len(t)), 800, 5000) * env


def pop(seed):
    t = _t(0.25)
    f = 700 + 500 * np.exp(-t * 60)
    ph = 2 * np.pi * np.cumsum(f) / SR
    out = np.sin(ph) * np.exp(-t * 30) * 0.7
    tp = tap(seed)
    out[:len(tp)] += tp * 0.4
    return out


def chime():
    t = _t(3.5)
    s = np.zeros_like(t)
    for base, g in ((NOTE["D5"], 1.0), (NOTE["A5"], 0.6), (NOTE["F#5"], 0.35)):
        for ratio, a, dec in ((1, 1, 1.4), (2.76, 0.35, 3.5), (5.4, 0.15, 7), (8.93, 0.06, 12)):
            s += g * a * np.sin(2 * np.pi * base * ratio * t) * np.exp(-t * dec)
    return s * np.minimum(1, t / 0.004)


def render(path, dur, events):
    n = int(dur * SR)
    music = pad(dur) + arp(dur)
    fx = np.zeros(n)
    fx_wet = np.zeros(n)
    for i, (kind, at) in enumerate(events):
        if kind == "tap":
            _add(fx, tap(i), at, 0.22)
        elif kind == "tick":
            _add(fx, tap(i, bright=1.8), at, 0.10)
        elif kind == "place":
            _add(fx, place_sound(i), at, 0.28)
        elif kind == "swish":
            _add(fx, swish(i), at - 0.12, 0.12)
        elif kind == "pop":
            _add(fx, pop(i), at, 0.20)
        elif kind == "thump":
            _add(fx, thump(), at, 0.55)
            _add(fx_wet, thump(), at, 0.3)
        elif kind == "whoosh":
            _add(fx, whoosh(i), at, 0.10)
        elif kind == "chime":
            _add(fx_wet, chime(), at, 0.20)
            _add(fx, thump(), at, 0.35)
    wet = _reverb(music * 0.7 + fx_wet + fx * 0.25)
    mix = music + fx + fx_wet * 0.6 + wet * 0.45
    # gentle fade in / out
    t = np.arange(n) / SR
    mix *= np.minimum(1, t / 0.25) * np.minimum(1, (dur - t) / 1.2)
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    mix *= 0.89 / np.max(np.abs(mix))  # about -1 dBFS peak
    # subtle stereo: short Haas delay on the reverb for width
    d = int(0.011 * SR)
    left = mix
    right = np.concatenate([mix[:d], mix[:-d] * 0.35 + mix[d:] * 0.65]) if d else mix
    right = right[:n]
    st = np.stack([left, right], 1)
    st = (np.clip(st, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(st.tobytes())
