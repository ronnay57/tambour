"""Génère le kit « electronic », inspiré des boîtes à rythmes analogiques (808 et 909).

Même format que les autres kits : 3 vélocités × 2 variantes, .ogg + .mp3,
dans public/sounds/electronic/.

Usage : python3 tools/sound-synth/electronic.py [--out public/sounds/electronic]
"""

import argparse

import numpy as np

from generate import (
    SAMPLE_RATE,
    bandpass_gain,
    build_kit,
    decay,
    gliding_sine,
    highpass_gain,
    jitter,
    lowpass_gain,
    shape_noise,
    soft_clip,
    time_axis,
)

# Les six oscillateurs carrés désaccordés du charleston et des cymbales de la 808.
METAL_FREQS = (205.3, 304.4, 369.6, 522.7, 540.0, 800.0)


def square(t, freq, phase=0.0):
    return np.sign(np.sin(2 * np.pi * freq * t + phase))


def filtered(signal, gain_fn):
    """Filtre un signal déjà enveloppé (zéro de phase, via la FFT)."""
    spectrum = np.fft.rfft(signal)
    freqs = np.fft.rfftfreq(len(signal), 1 / SAMPLE_RATE)
    return np.fft.irfft(spectrum * gain_fn(freqs), len(signal))


def metal(t, rng):
    return sum(square(t, jitter(rng, f, 0.002), rng.uniform(0, 6.3)) for f in METAL_FREQS) / len(METAL_FREQS)


def kick(vel, rng):
    """Grosse caisse 909 : attaque nette, corps court et rond."""
    t = time_axis(0.9)
    body = gliding_sine(t, jitter(rng, 54, 0.01), glide=2.4 + vel, glide_seconds=0.025) * decay(t, 0.28)
    click = shape_noise(rng, 0.9, lambda f: bandpass_gain(f, 2000, 9000)) * decay(t, 0.003) * (0.08 + 0.12 * vel)
    return soft_clip(body + click, 1.4 + 0.6 * vel)


def kick_boom(vel, rng):
    """Grosse caisse 808 : sinus grave très long, la basse des musiques urbaines."""
    t = time_axis(3.5)
    body = gliding_sine(t, jitter(rng, 46, 0.01), glide=0.9 + 0.5 * vel, glide_seconds=0.02) * decay(t, 0.75)
    return soft_clip(body, 1.2 + 0.8 * vel)


def snare(vel, rng):
    """Caisse claire 808 : deux sinus accordés et un souffle de bruit."""
    t = time_axis(0.6)
    tone = (
        np.sin(2 * np.pi * jitter(rng, 185, 0.01) * t) * decay(t, 0.09)
        + 0.6 * np.sin(2 * np.pi * jitter(rng, 330, 0.01) * t) * decay(t, 0.06)
    )
    snappy = shape_noise(rng, 0.6, lambda f: highpass_gain(f, 1800 + 1500 * vel, 2) * lowpass_gain(f, 14000)) * decay(t, 0.13 + 0.05 * vel)
    return soft_clip(tone + (0.2 + 0.2 * vel) * snappy, 1.5)


def clap(vel, rng):
    """Clap 808 : quatre salves de bruit rapprochées, puis une courte réverbération."""
    t = time_axis(0.7)
    noise = shape_noise(rng, 0.7, lambda f: bandpass_gain(f, 900, 3200 + 1500 * vel, 2))
    envelope = np.zeros_like(t)
    for burst in range(3):
        start = burst * jitter(rng, 0.011, 0.1)
        local = np.clip(t - start, 0, None)
        envelope += (t >= start) * decay(local, 0.006)
    tail_start = 3 * 0.011
    envelope += 0.8 * (t >= tail_start) * decay(np.clip(t - tail_start, 0, None), 0.11 + 0.06 * vel)
    return noise * envelope


def rimshot(vel, rng):
    t = time_axis(0.2)
    tone = np.sin(2 * np.pi * jitter(rng, 1690, 0.01) * t) + 0.7 * square(t, jitter(rng, 455, 0.01))
    return filtered(tone * decay(t, 0.012 + 0.008 * vel), lambda f: bandpass_gain(f, 400, 6000))


def tom(vel, rng, freq):
    t = time_axis(2.0)
    body = gliding_sine(t, jitter(rng, freq, 0.01), glide=0.35 + 0.2 * vel, glide_seconds=0.06) * decay(t, 0.24 + 60 / freq)
    hit = shape_noise(rng, 2.0, lambda f: bandpass_gain(f, freq * 2, freq * 12)) * decay(t, 0.01) * 0.3 * vel
    return soft_clip(body + hit, 1.4)


def hihat(vel, rng, open_hat):
    duration = 1.4 if open_hat else 0.4
    t = time_axis(duration)
    tone = metal(t, rng) + 0.6 * shape_noise(rng, duration, lambda f: highpass_gain(f, 6000))
    hat_decay = jitter(rng, 0.32, 0.06) if open_hat else jitter(rng, 0.035 + 0.015 * vel, 0.08)
    return filtered(tone * decay(t, hat_decay), lambda f: bandpass_gain(f, 6500 - 1000 * vel, 15000, 3))


def cymbal(vel, rng, ride):
    duration = 4.5
    t = time_axis(duration)
    tone = metal(t, rng)
    if ride:
        # Ride 909 : le métal domine, avec une attaque « ping » plus marquée.
        body = filtered(tone * decay(t, 1.1), lambda f: bandpass_gain(f, 3500, 11000, 2))
        ping = filtered(tone * decay(t, 0.03), lambda f: bandpass_gain(f, 2500, 8000))
        return body + (0.5 + 0.5 * vel) * ping
    wash = shape_noise(rng, duration, lambda f: bandpass_gain(f, 4000, 14000, 2)) * decay(t, 0.9 + 0.3 * vel)
    body = filtered(tone * decay(t, 0.7 + 0.3 * vel), lambda f: highpass_gain(f, 4000, 2))
    return 0.8 * body + 0.5 * wash


def cowbell(vel, rng):
    t = time_axis(0.8)
    tone = square(t, jitter(rng, 540, 0.004)) + square(t, jitter(rng, 800, 0.004))
    envelope = 0.6 * decay(t, 0.015) + 0.4 * decay(t, 0.16)
    return filtered(tone * envelope, lambda f: bandpass_gain(f, 600, 2600 + 1000 * vel, 2))


def clave(vel, rng):
    t = time_axis(0.15)
    return np.sin(2 * np.pi * jitter(rng, 2500, 0.01) * t) * decay(t, 0.022)


PIECES = {
    "kick": {"name": "Grosse caisse (909)", "synth": kick, "gain": 1.0},
    "kick-boom": {"name": "Grosse caisse longue (808)", "synth": kick_boom, "gain": 0.9},
    "snare": {"name": "Caisse claire (808)", "synth": snare, "gain": 0.85},
    "clap": {"name": "Clap", "synth": clap, "gain": 0.8},
    "snare-rimshot": {"name": "Rimshot", "synth": rimshot, "gain": 0.6},
    "tom-high": {"name": "Tom aigu", "synth": lambda v, r: tom(v, r, 210), "gain": 0.8},
    "tom-mid": {"name": "Tom médium", "synth": lambda v, r: tom(v, r, 150), "gain": 0.8},
    "tom-floor": {"name": "Tom basse", "synth": lambda v, r: tom(v, r, 100), "gain": 0.85},
    "hihat-closed": {"name": "Charleston fermé", "synth": lambda v, r: hihat(v, r, False), "gain": 0.5},
    "hihat-open": {"name": "Charleston ouvert", "synth": lambda v, r: hihat(v, r, True), "gain": 0.5},
    "crash": {"name": "Crash", "synth": lambda v, r: cymbal(v, r, False), "gain": 0.55},
    "ride": {"name": "Ride", "synth": lambda v, r: cymbal(v, r, True), "gain": 0.45},
    "cowbell": {"name": "Cloche (cowbell)", "synth": cowbell, "gain": 0.45},
    "clave": {"name": "Claves", "synth": clave, "gain": 0.5},
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="public/sounds/electronic")
    parser.add_argument("--wav", help="Dossier où garder aussi les .wav (pour vérifier)")
    args = parser.parse_args()
    build_kit("electronic", "Batterie électronique", PIECES, args.out, args.wav)


if __name__ == "__main__":
    main()
