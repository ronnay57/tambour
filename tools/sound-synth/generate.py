"""Génère le kit « acoustic » par synthèse (aucun échantillon externe).

Chaque pièce est produite en 3 vélocités × 2 variantes, puis encodée en
.ogg (Vorbis) et .mp3 de secours dans public/sounds/acoustic/.

Usage : python3 tools/sound-synth/generate.py [--out public/sounds/acoustic]
Dépendances : numpy, ffmpeg (avec libvorbis et libmp3lame).
"""

import argparse
import json
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

SAMPLE_RATE = 44100
VELOCITIES = {"v1": 0.45, "v2": 0.72, "v3": 1.0}
VARIANT_COUNT = 2
PEAK_TARGET = 10 ** (-1 / 20)  # -1 dBFS sur la vélocité la plus forte
TAIL_FLOOR_DB = -60
FADE_OUT_SECONDS = 0.02
ATTACK_SECONDS = 0.0005
TRUNCATED_FADE_RATIO = 0.3
OGG_QUALITY = "6"
MP3_VBR_QUALITY = "2"


# --- Briques de base -------------------------------------------------------


def time_axis(duration):
    return np.arange(int(duration * SAMPLE_RATE)) / SAMPLE_RATE


def decay(t, seconds):
    return np.exp(-t / seconds)


def highpass_gain(freqs, cutoff, order=2):
    with np.errstate(divide="ignore"):
        ratio = np.where(freqs > 0, cutoff / np.maximum(freqs, 1e-9), np.inf)
    return 1 / np.sqrt(1 + ratio ** (2 * order))


def lowpass_gain(freqs, cutoff, order=2):
    return 1 / np.sqrt(1 + (freqs / cutoff) ** (2 * order))


def bandpass_gain(freqs, low, high, order=2):
    return highpass_gain(freqs, low, order) * lowpass_gain(freqs, high, order)


def shape_noise(rng, duration, gain_fn):
    """Bruit blanc filtré en fréquence (filtrage à phase nulle, avant enveloppe)."""
    n = int(duration * SAMPLE_RATE)
    spectrum = np.fft.rfft(rng.standard_normal(n))
    freqs = np.fft.rfftfreq(n, 1 / SAMPLE_RATE)
    out = np.fft.irfft(spectrum * gain_fn(freqs), n)
    return out / (np.std(out) + 1e-12)


def gliding_sine(t, freq, glide=0.0, glide_seconds=0.05, phase=0.0):
    """Sinus dont la fréquence chute de freq*(1+glide) vers freq, comme une peau détendue après l'impact."""
    inst = freq * (1 + glide * np.exp(-t / glide_seconds))
    return np.sin(2 * np.pi * np.cumsum(inst) / SAMPLE_RATE + phase)


def membrane(t, rng, fundamental, decay_seconds, glide, brightness, modes=None):
    """Synthèse modale d'une peau : modes de Bessel d'une membrane circulaire."""
    if modes is None:
        modes = [
            (1.00, 1.00, 1.00),
            (1.59, 0.55, 0.70),
            (2.14, 0.40, 0.55),
            (2.30, 0.30, 0.50),
            (2.65, 0.22, 0.42),
            (2.92, 0.18, 0.38),
            (3.16, 0.12, 0.33),
            (3.50, 0.09, 0.30),
        ]
    out = np.zeros_like(t)
    for ratio, amp, decay_ratio in modes:
        # Les frappes fortes excitent davantage les modes aigus.
        level = amp * brightness ** (ratio - 1)
        detune = 1 + rng.uniform(-0.004, 0.004)
        out += (
            level
            * gliding_sine(t, fundamental * ratio * detune, glide, 0.04, rng.uniform(0, 2 * np.pi))
            * decay(t, decay_seconds * decay_ratio)
        )
    return out


def metal_partials(t, rng, count, low, high, decay_low, decay_high, tilt=0.0):
    """Partiels inharmoniques denses (cymbales, charleston) ; les aigus s'éteignent plus vite."""
    freqs = np.exp(rng.uniform(np.log(low), np.log(high), count))
    out = np.zeros_like(t)
    for freq in freqs:
        position = np.log(freq / low) / np.log(high / low)
        decay_seconds = decay_low * (decay_high / decay_low) ** position
        amp = rng.uniform(0.3, 1.0) * (freq / low) ** (-tilt)
        out += amp * np.sin(2 * np.pi * freq * t + rng.uniform(0, 2 * np.pi)) * decay(t, decay_seconds)
    return out / np.sqrt(count)


def soft_clip(x, drive):
    return np.tanh(drive * x) / np.tanh(drive)


def jitter(rng, value, amount):
    return value * (1 + rng.uniform(-amount, amount))


# --- Pièces du kit ---------------------------------------------------------


def kick(vel, rng):
    t = time_axis(1.6)
    body_decay = jitter(rng, 0.32, 0.05)
    body = gliding_sine(t, jitter(rng, 52, 0.02), glide=1.6 + 1.2 * vel, glide_seconds=0.035) * decay(t, body_decay)
    overtone = 0.25 * gliding_sine(t, 83, glide=1.2, glide_seconds=0.03) * decay(t, 0.12)
    beater_noise = shape_noise(rng, 1.6, lambda f: bandpass_gain(f, 1500, 6000 + 4000 * vel))
    beater = (0.05 + 0.15 * vel) * beater_noise * decay(t, 0.004)
    thump = 0.3 * shape_noise(rng, 1.6, lambda f: bandpass_gain(f, 60, 400)) * decay(t, 0.03)
    return soft_clip(body + overtone + beater + thump, 1.2 + vel)


def snare(vel, rng, rimshot=False):
    t = time_axis(1.4)
    head = membrane(t, rng, jitter(rng, 190, 0.01), 0.22, glide=0.06 * vel, brightness=0.6 + 0.35 * vel)
    wires_bright = shape_noise(rng, 1.4, lambda f: bandpass_gain(f, 3000, 9000 + 5000 * vel, 2))
    wires_body = shape_noise(rng, 1.4, lambda f: bandpass_gain(f, 800, 4000, 2))
    wires_decay = jitter(rng, 0.11 + 0.06 * vel, 0.06)
    wires = (0.55 * wires_bright * decay(t, wires_decay * 0.7) + 0.45 * wires_body * decay(t, wires_decay)) * (0.4 + 0.6 * vel)
    stick = shape_noise(rng, 1.4, lambda f: bandpass_gain(f, 2000, 12000)) * decay(t, 0.003) * vel
    out = 1.0 * head + 0.32 * wires + 0.2 * stick
    if rimshot:
        # Le cercle métallique ajoute un « ping » aigu et une attaque plus sèche.
        ring = sum(
            amp * np.sin(2 * np.pi * freq * t) * decay(t, dec)
            for freq, amp, dec in [(920, 0.5, 0.06), (1610, 0.35, 0.04), (2830, 0.25, 0.03), (4400, 0.15, 0.02)]
        )
        out = out + 0.7 * ring + 0.3 * stick
    return soft_clip(out, 1.5 + vel)


def side_stick(vel, rng):
    t = time_axis(0.4)
    wood = sum(
        amp * np.sin(2 * np.pi * jitter(rng, freq, 0.02) * t) * decay(t, dec)
        for freq, amp, dec in [(520, 0.6, 0.035), (1180, 0.8, 0.025), (1950, 0.5, 0.018), (3100, 0.3, 0.012)]
    )
    click = shape_noise(rng, 0.4, lambda f: bandpass_gain(f, 1500, 8000)) * decay(t, 0.004)
    head = 0.3 * membrane(t, rng, 190, 0.08, 0.0, 0.5)
    return wood + 0.6 * vel * click + head


def tom(vel, rng, fundamental, decay_seconds):
    t = time_axis(decay_seconds * 6)
    head = membrane(
        t, rng, jitter(rng, fundamental, 0.01), jitter(rng, decay_seconds, 0.05),
        glide=0.08 + 0.1 * vel, brightness=0.45 + 0.35 * vel,
    )
    stick = shape_noise(rng, len(t) / SAMPLE_RATE, lambda f: bandpass_gain(f, 1000, 7000)) * decay(t, 0.004) * vel
    shell = 0.25 * shape_noise(rng, len(t) / SAMPLE_RATE, lambda f: bandpass_gain(f, fundamental, fundamental * 6)) * decay(t, 0.05)
    return soft_clip(head + 0.25 * stick + shell, 1.3 + 0.5 * vel)


def hihat(vel, rng, kind):
    durations = {"closed": 0.4, "open": 2.6, "pedal": 0.3}
    t = time_axis(durations[kind])
    duration = len(t) / SAMPLE_RATE
    if kind == "closed":
        body_decay, noise_decay, low_cut = jitter(rng, 0.045, 0.1), 0.03, 5000
    elif kind == "open":
        body_decay, noise_decay, low_cut = jitter(rng, 0.45, 0.08), 0.35, 4000
    else:
        body_decay, noise_decay, low_cut = 0.035, 0.025, 2500
    metal = metal_partials(t, rng, 140, 2500, 14000, body_decay * 1.4, body_decay * 0.7)
    sizzle = shape_noise(rng, duration, lambda f: highpass_gain(f, low_cut + 2000 * vel, 3) * lowpass_gain(f, 16000))
    out = 0.8 * metal + 0.6 * sizzle * decay(t, noise_decay)
    stick = shape_noise(rng, duration, lambda f: bandpass_gain(f, 2000, 10000)) * decay(t, 0.002)
    if kind == "pedal":
        # Le « tchick » des deux cymbales qui se referment : attaque plus douce, sans baguette.
        envelope = np.minimum(t / 0.004, 1.0)
        return out * envelope
    return out + 0.5 * vel * stick


def crash(vel, rng, size=1.0):
    duration = 5.0 * size
    t = time_axis(duration)
    wash = shape_noise(rng, duration, lambda f: bandpass_gain(f, 2500 / size, 14000, 2))
    wash_low = shape_noise(rng, duration, lambda f: bandpass_gain(f, 600 / size, 4000, 2))
    # La cymbale « s'épanouit » : le souffle grave monte juste après l'attaque.
    bloom = (1 - decay(t, 0.03)) * decay(t, jitter(rng, 1.1 * size, 0.08))
    metal = metal_partials(t, rng, 220, 400 / size, 13000, 1.6 * size, 0.5 * size, tilt=0.2)
    attack = shape_noise(rng, duration, lambda f: highpass_gain(f, 3000, 2)) * decay(t, 0.05)
    out = (
        0.55 * wash * decay(t, 0.7 * size * (0.8 + 0.3 * vel))
        + 0.45 * wash_low * bloom
        + 0.8 * metal
        + (0.3 + 0.5 * vel) * attack
    )
    return out


def ride(vel, rng, bell=False):
    duration = 5.5
    t = time_axis(duration)
    if bell:
        partials = [(720, 1.0, 2.2), (1735, 0.7, 1.6), (2590, 0.55, 1.3), (3910, 0.4, 0.9), (5240, 0.25, 0.6)]
        tone = sum(
            amp * np.sin(2 * np.pi * jitter(rng, freq, 0.003) * t + rng.uniform(0, 6.3)) * decay(t, dec)
            for freq, amp, dec in partials
        )
        wash = metal_partials(t, rng, 120, 500, 10000, 2.0, 0.6, tilt=0.3)
        ping = shape_noise(rng, duration, lambda f: bandpass_gain(f, 2000, 9000)) * decay(t, 0.006)
        return 0.9 * tone + 0.4 * wash + 0.4 * vel * ping
    metal = metal_partials(t, rng, 260, 350, 12000, 2.8, 0.7, tilt=0.35)
    ping_tone = sum(
        amp * np.sin(2 * np.pi * jitter(rng, freq, 0.01) * t) * decay(t, dec)
        for freq, amp, dec in [(3100, 0.5, 0.25), (4700, 0.35, 0.18), (6300, 0.25, 0.12)]
    )
    wash = shape_noise(rng, duration, lambda f: bandpass_gain(f, 3000, 12000, 2)) * (1 - decay(t, 0.02)) * decay(t, 1.4)
    ping = shape_noise(rng, duration, lambda f: bandpass_gain(f, 2500, 11000)) * decay(t, 0.005)
    return metal + 0.5 * ping_tone + (0.15 + 0.15 * vel) * wash + 0.5 * vel * ping


def cowbell(vel, rng):
    t = time_axis(1.2)
    tone = sum(
        amp * np.sin(2 * np.pi * jitter(rng, freq, 0.004) * t + rng.uniform(0, 6.3)) * decay(t, dec)
        for freq, amp, dec in [(587, 1.0, 0.16), (845, 0.8, 0.12), (1395, 0.35, 0.07), (2210, 0.2, 0.05)]
    )
    click = shape_noise(rng, 1.2, lambda f: bandpass_gain(f, 1500, 7000)) * decay(t, 0.003)
    return soft_clip(tone + 0.5 * vel * click, 2.0)


PIECES = {
    "kick": {"name": "Grosse caisse", "synth": kick, "gain": 1.0},
    "snare": {"name": "Caisse claire", "synth": snare, "gain": 0.9},
    "snare-rimshot": {"name": "Caisse claire (rimshot)", "synth": lambda v, r: snare(v, r, rimshot=True), "gain": 0.9},
    "snare-sidestick": {"name": "Caisse claire (cross-stick)", "synth": side_stick, "gain": 0.7},
    "tom-high": {"name": "Tom aigu", "synth": lambda v, r: tom(v, r, 220, 0.32), "gain": 0.85},
    "tom-mid": {"name": "Tom médium", "synth": lambda v, r: tom(v, r, 160, 0.4), "gain": 0.85},
    "tom-floor": {"name": "Tom basse", "synth": lambda v, r: tom(v, r, 98, 0.55), "gain": 0.9},
    "hihat-closed": {"name": "Charleston fermé", "synth": lambda v, r: hihat(v, r, "closed"), "gain": 0.55},
    "hihat-open": {"name": "Charleston ouvert", "synth": lambda v, r: hihat(v, r, "open"), "gain": 0.55},
    "hihat-pedal": {"name": "Charleston au pied", "synth": lambda v, r: hihat(v, r, "pedal"), "gain": 0.45},
    "crash": {"name": "Crash", "synth": crash, "gain": 0.6},
    "splash": {"name": "Splash", "synth": lambda v, r: crash(v, r, size=0.45), "gain": 0.5},
    "ride": {"name": "Ride", "synth": ride, "gain": 0.5},
    "ride-bell": {"name": "Ride (cloche)", "synth": lambda v, r: ride(v, r, bell=True), "gain": 0.5},
    "cowbell": {"name": "Cloche (cowbell)", "synth": cowbell, "gain": 0.45},
}


# --- Finition et encodage --------------------------------------------------


def finish(signal):
    """Attaque immédiate (aucun silence au début), queue coupée sous -60 dB avec fondu."""
    attack = int(ATTACK_SECONDS * SAMPLE_RATE)
    signal[:attack] *= np.linspace(0, 1, attack)
    envelope = np.abs(signal)
    threshold = envelope.max() * 10 ** (TAIL_FLOOR_DB / 20)
    last = np.nonzero(envelope > threshold)[0][-1]
    fade = int(FADE_OUT_SECONDS * SAMPLE_RATE)
    end = min(len(signal), last + fade)
    if end == len(signal):
        # Queue encore audible en fin de tampon : long fondu pour éviter une coupure nette.
        fade = int(len(signal) * TRUNCATED_FADE_RATIO)
    signal = signal[:end].copy()
    signal[-fade:] *= np.linspace(1, 0, fade)
    return signal


def write_wav(path, signal):
    pcm = (np.clip(signal, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm.tobytes())


def encode(wav_path, out_base):
    common = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav_path), "-map_metadata", "-1"]
    subprocess.run(common + ["-c:a", "libvorbis", "-q:a", OGG_QUALITY, f"{out_base}.ogg"], check=True)
    subprocess.run(common + ["-c:a", "libmp3lame", "-q:a", MP3_VBR_QUALITY, f"{out_base}.mp3"], check=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="public/sounds/acoustic")
    parser.add_argument("--wav", help="Dossier où garder aussi les .wav (pour vérifier)")
    args = parser.parse_args()
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = {"id": "acoustic", "name": "Batterie acoustique", "sampleRate": SAMPLE_RATE, "pieces": []}

    with tempfile.TemporaryDirectory() as tmp:
        for seed_base, (piece_id, piece) in enumerate(PIECES.items()):
            rendered = {}
            for layer, vel in VELOCITIES.items():
                for variant in range(1, VARIANT_COUNT + 1):
                    # Graine fixe : relancer le script redonne exactement les mêmes sons.
                    rng = np.random.default_rng(1000 * seed_base + 10 * int(layer[1]) + variant)
                    rendered[(layer, variant)] = vel * piece["synth"](vel, rng)
            # Un seul gain par pièce : les vélocités gardent leurs écarts de volume.
            peak = max(np.abs(sig).max() for sig in rendered.values())
            files = {layer: [] for layer in VELOCITIES}
            for (layer, variant), sig in rendered.items():
                name = f"{piece_id}-{layer}-{variant}"
                wav_path = Path(args.wav or tmp) / f"{name}.wav"
                wav_path.parent.mkdir(parents=True, exist_ok=True)
                write_wav(wav_path, finish(sig * PEAK_TARGET / peak))
                encode(wav_path, out_dir / name)
                files[layer].append(name)
            manifest["pieces"].append({
                "id": piece_id,
                "name": piece["name"],
                "gain": piece["gain"],
                "velocities": [{"layer": layer, "max": VELOCITIES[layer], "files": files[layer]} for layer in VELOCITIES],
            })
            print(f"{piece_id}: {len(rendered)} sons")

    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
