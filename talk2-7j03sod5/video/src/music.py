#!/usr/bin/env python3
"""Background music for the highlight video, made from scratch (no samples, no licence needed).

A calm, hopeful loop in C major (C - G - Am - F, 96 BPM): soft pad, a piano-like
arpeggio, a light bass and, later, a gentle beat. Fades in and out.

  python3 music.py <seconds> <out.wav>
"""
import sys, wave
import numpy as np

SR = 44100
dur = float(sys.argv[1]) if len(sys.argv) > 1 else 70.0
out = sys.argv[2] if len(sys.argv) > 2 else 'music.wav'
n = int(SR * (dur + 2.5))
L = np.zeros(n); R = np.zeros(n)
rng = np.random.default_rng(7)

BPM = 96
beat = 60 / BPM
bar = 4 * beat
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)

# chords as MIDI notes: root (bass), pad voicing, arpeggio notes
CHORDS = [
    (36, [60, 64, 67], [72, 76, 79, 84]),   # C
    (43, [59, 62, 67], [71, 74, 79, 83]),   # G
    (45, [60, 64, 69], [72, 76, 81, 84]),   # Am
    (41, [60, 65, 69], [72, 77, 81, 84]),   # F
]

def add(buf, start, sig, gain=1.0):
    i = int(start * SR)
    if i >= len(buf): return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain

def pad(freq, length):
    t = np.arange(int(length * SR)) / SR
    s = np.zeros_like(t)
    for k, a in ((1, 1.0), (2, .35), (3, .18), (4, .08)):
        for det in (-0.12, 0.12):  # slight detune for width
            s += a * np.sin(2 * np.pi * freq * k * (1 + det / 100) * t)
    env = np.minimum(1, t / 0.6) * np.minimum(1, (length - t) / 0.8)
    return s * np.clip(env, 0, 1) * 0.5

def keys(freq, length=1.6):
    t = np.arange(int(length * SR)) / SR
    s = np.sin(2 * np.pi * freq * t) + .35 * np.sin(4 * np.pi * freq * t) * np.exp(-t * 3) + .12 * np.sin(6 * np.pi * freq * t) * np.exp(-t * 5)
    env = np.minimum(1, t / 0.006) * np.exp(-t * 2.4)
    return s * env

def bass(freq, length=1.2):
    t = np.arange(int(length * SR)) / SR
    s = np.sin(2 * np.pi * freq * t) + .25 * np.sin(4 * np.pi * freq * t)
    return s * np.minimum(1, t / 0.01) * np.exp(-t * 2.2)

def kick():
    t = np.arange(int(0.25 * SR)) / SR
    f = 50 + 70 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)

def shaker():
    m = int(0.08 * SR)
    s = rng.standard_normal(m)
    s = np.diff(s, prepend=0)  # brighter
    return s * np.exp(-np.arange(m) / SR * 45)

nbars = int(np.ceil(dur / bar)) + 1
for b in range(nbars):
    t0 = b * bar
    root, voicing, arp = CHORDS[b % 4]
    for m in voicing:
        p = pad(hz(m), bar + 0.6)
        add(L, t0, p, 0.045); add(R, t0, p, 0.045)
    if b >= 1:  # arpeggio in eighth notes
        pattern = [0, 1, 2, 3, 2, 1, 2, 3]
        for i, k in enumerate(pattern):
            s = keys(hz(arp[k]))
            pan = 0.35 if i % 2 else -0.35
            g = 0.10 * (1.0 if i % 4 == 0 else 0.75)
            add(L, t0 + i * beat / 2, s, g * (1 - pan)); add(R, t0 + i * beat / 2, s, g * (1 + pan))
    if b >= 2:
        for q in (0, 2):
            s = bass(hz(root))
            add(L, t0 + q * beat, s, 0.16); add(R, t0 + q * beat, s, 0.16)
    if b >= 4:
        for q in range(4):
            add(L, t0 + q * beat, kick(), 0.18); add(R, t0 + q * beat, kick(), 0.18)
            sh = shaker()
            add(L, t0 + q * beat + beat / 2, sh, 0.012); add(R, t0 + q * beat + beat / 2, sh, 0.016)

# simple reverb: convolve with a decaying noise tail
ir_len = int(1.8 * SR)
ir = rng.standard_normal(ir_len) * np.exp(-np.arange(ir_len) / SR * 3.2)
ir[0] = 0
ir /= np.sqrt(np.sum(ir ** 2))
def conv(x):
    m = 1 << int(np.ceil(np.log2(len(x) + ir_len)))
    return np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[: len(x)]
L = L + 0.22 * conv(L); R = R + 0.22 * conv(R)

# fades, length, level
total = int(SR * dur)
L, R = L[:total], R[:total]
t = np.arange(total) / SR
env = np.minimum(1, t / 1.5) * np.clip((dur - t) / 3.5, 0, 1)
L *= env; R *= env
peak = max(np.abs(L).max(), np.abs(R).max())
L *= 0.78 / peak; R *= 0.78 / peak
pcm = (np.stack([L, R], axis=1) * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', out, f'{dur:.1f}s')
