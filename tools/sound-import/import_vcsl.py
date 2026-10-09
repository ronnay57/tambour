"""Construit les kits « acoustic » et « world » à partir des échantillons VCSL.

VCSL (Versilian Community Sample Library) est sous licence CC0 1.0 :
https://github.com/sgossner/VCSL

Chaque pièce sort en 3 couches de vélocité (v1 douce, v2 moyenne, v3 forte),
avec 1 ou 2 variantes par couche selon ce que la bibliothèque propose, au
format .ogg + .mp3 de secours, stéréo 44,1 kHz.

Usage :
    git clone --depth 1 --filter=blob:none --sparse https://github.com/sgossner/VCSL.git
    git -C VCSL sparse-checkout set "Membranophones/Struck Membranophones" "Idiophones/Struck Idiophones"
    python3 tools/sound-import/import_vcsl.py --vcsl VCSL
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
CHANNELS = 2
LAYER_MAX = {"v1": 0.45, "v2": 0.72, "v3": 1.0}
# Pic visé pour chaque couche : les enregistrements doux de VCSL sont très bas
# (jusqu'à -30 dB) ; on resserre l'écart pour qu'une frappe légère reste audible.
LAYER_PEAK_DB = {"v1": -12, "v2": -6, "v3": -1}
ONSET_THRESHOLD = 0.05  # part du pic qui marque l'impact
PRE_ONSET_SECONDS = 0.001
FADE_IN_SECONDS = 0.0005
TAIL_FLOOR_DB = -55
FADE_OUT_SECONDS = 0.03
CAPPED_FADE_RATIO = 0.3
# Quand la bibliothèque n'a qu'une seule force de frappe, la couche douce en
# est une copie plus sourde, comme une vraie frappe légère.
SOFT_LOWPASS_HZ = 6000
OGG_QUALITY = "6"
MP3_VBR_QUALITY = "2"

MEMBRANES = "Membranophones/Struck Membranophones"
IDIOPHONES = "Idiophones/Struck Idiophones"


def src(path, lowpass=None, semitones=0.0):
    return {"path": path, "lowpass": lowpass, "semitones": semitones}


def rr_layers(pattern, levels, **options):
    """Trois couches à partir de trois niveaux enregistrés, chacun en deux variantes (rr1, rr2)."""
    return {
        layer: [src(pattern.format(level=level, rr=rr), **options) for rr in (1, 2)]
        for layer, level in zip(LAYER_MAX, levels)
    }


def single_layers(paths, **options):
    """Trois couches à partir d'une seule force de frappe enregistrée."""
    return {
        "v1": [src(p, SOFT_LOWPASS_HZ, **options) for p in paths],
        "v2": [src(p, **options) for p in paths],
        "v3": [src(p, **options) for p in paths],
    }


def level_layers(paths, **options):
    """Trois couches à partir de trois enregistrements (un par force de frappe)."""
    return {layer: [src(p, **options)] for layer, p in zip(LAYER_MAX, paths)}


TOM_1 = f"{MEMBRANES}/Tom 1/Stick/TomH_HitS_v{{level}}_rr{{rr}}_Mid.wav"
TOM_2 = f"{MEMBRANES}/Tom 2/Stick/TomL_HitS_v{{level}}_rr{{rr}}_Mid.wav"
SNARE = f"{MEMBRANES}/Snare Drum, Modern 3/Snare4_{{kind}}_v{{level}}_rr{{rr}}_Mid.wav"
CYMBAL_1 = f"{IDIOPHONES}/Suspended Cymbal 1/susCymb1_hit"
CYMBAL_2 = f"{IDIOPHONES}/Suspended Cymbal 2/susCymb2_hit"
HIHAT = f"{IDIOPHONES}/Hi-Hat Cymbal/HiHat"

ACOUSTIC = {
    "id": "acoustic",
    "name": "Batterie acoustique",
    "pieces": [
        ("kick", "Grosse caisse", 1.0, 1.5,
         rr_layers(f"{MEMBRANES}/Bass Drum 1/BDrumNew_hit_v{{level}}_rr{{rr}}_Sum.wav", (2, 5, 7))),
        ("snare", "Caisse claire", 0.9, 1.2, rr_layers(SNARE.replace("{kind}", "HitSN"), (2, 4, 5))),
        ("snare-rimshot", "Caisse claire (rimshot)", 0.85, 1.2, {
            "v1": [src(SNARE.format(kind="rimshot", level=2, rr=rr), SOFT_LOWPASS_HZ) for rr in (1, 2)],
            "v2": [src(SNARE.format(kind="rimshot", level=2, rr=rr)) for rr in (1, 2)],
            "v3": [src(SNARE.format(kind="rimshot", level=4, rr=rr)) for rr in (1, 2)],
        }),
        ("snare-sidestick", "Caisse claire (cross-stick)", 0.7, 0.6,
         single_layers([SNARE.format(kind="Xstick", level=2, rr=rr) for rr in (1, 2)])),
        # Les deux toms VCSL sont proches en hauteur : on les réaccorde pour étager aigu, médium et basse.
        ("tom-high", "Tom aigu", 0.85, 2.0, rr_layers(TOM_1, (2, 3, 4), semitones=3)),
        ("tom-mid", "Tom médium", 0.85, 2.2, rr_layers(TOM_2, (2, 3, 4))),
        ("tom-floor", "Tom basse", 0.9, 2.8, rr_layers(TOM_2, (2, 3, 4), semitones=-4)),
        ("hihat-closed", "Charleston fermé", 0.6, 0.6, rr_layers(f"{HIHAT}_HitC_v{{level}}_rr{{rr}}_Mid.wav", (2, 3, 4))),
        ("hihat-open", "Charleston ouvert", 0.6, 3.0,
         single_layers([f"{HIHAT}_HitO_rr{rr}_Mid.wav" for rr in (1, 2)])),
        ("hihat-pedal", "Charleston au pied", 0.5, 0.5,
         single_layers([f"{HIHAT}_Close_rr{rr}_Mid.wav" for rr in (1, 2)])),
        ("crash", "Crash", 0.65, 5.0, level_layers([f"{CYMBAL_1}_stick_{lv}1.wav" for lv in ("pp", "mp", "f")])),
        # Pas de splash dans VCSL : la crash réaccordée plus haut et raccourcie s'en approche.
        ("splash", "Splash", 0.55, 2.0,
         level_layers([f"{CYMBAL_1}_stick_{lv}1.wav" for lv in ("pp", "mp", "f")], semitones=5)),
        ("ride", "Ride", 0.55, 5.0, level_layers([f"{CYMBAL_2}_stick_{lv}1.wav" for lv in ("pp", "mp", "mf")])),
        ("ride-bell", "Ride (cloche)", 0.5, 4.0, level_layers([f"{CYMBAL_1}_bell_{lv}1.wav" for lv in ("pp", "mf", "fff")])),
        ("cowbell", "Cloche (cowbell)", 0.5, 0.8,
         level_layers([f"{IDIOPHONES}/Cowbells/Cowbell1_Hit_v{lv}_rr1_Mid.wav" for lv in (2, 3, 4)])),
    ],
}

CONGA = f"{MEMBRANES}/Conga"
DARBUKA = f"{MEMBRANES}/Darbuka/Darbuka_{{stroke}}_hit_vl{{level}}_rr{{rr}}.wav"
CAJON = f"{IDIOPHONES}/Cajon/Cajon_hit{{stroke}}_{{level}}_rr{{rr}}.wav"
FRAME = f"{MEMBRANES}/Frame Drum/HDrum{{size}}_Hit_v{{level}}_rr{{rr}}_Sum.wav"


def two_level_layers(pattern):
    """Trois couches à partir de deux forces de frappe enregistrées (vl1, vl2)."""
    return {
        "v1": [src(pattern.format(level=1, rr=rr), SOFT_LOWPASS_HZ) for rr in (1, 2)],
        "v2": [src(pattern.format(level=1, rr=rr)) for rr in (1, 2)],
        "v3": [src(pattern.format(level=2, rr=rr)) for rr in (1, 2)],
    }


WORLD = {
    "id": "world",
    "name": "Percussions du monde",
    "pieces": [
        ("bongo-high", "Bongo aigu", 0.8, 1.0, rr_layers(f"{MEMBRANES}/Bongos/BongoH_Hit1_v{{level}}_rr{{rr}}_Mid.wav", (1, 2, 3))),
        ("bongo-low", "Bongo grave", 0.8, 1.0, rr_layers(f"{MEMBRANES}/Bongos/BongoL_Hit1_v{{level}}_rr{{rr}}_Mid.wav", (1, 2, 3))),
        ("conga-open", "Conga ouverte", 0.85, 0.9, rr_layers(f"{CONGA}/Conga_HitN_v{{level}}_rr{{rr}}_Sum.wav", (1, 2, 3))),
        ("conga-muted", "Conga étouffée", 0.8, 0.9, two_level_layers(f"{CONGA}/Conga_HitFM_v{{level}}_rr{{rr}}_Sum.wav")),
        ("tumba", "Tumba", 0.9, 0.9, rr_layers(f"{CONGA}/Tumba_HitN_v{{level}}_rr{{rr}}_Sum.wav", (2, 3, 4))),
        ("darbuka-doum", "Darbouka (doum)", 0.9, 1.2, two_level_layers(DARBUKA.replace("{stroke}", "1"))),
        ("darbuka-tek", "Darbouka (tek)", 0.75, 0.6, two_level_layers(DARBUKA.replace("{stroke}", "2"))),
        ("darbuka-ka", "Darbouka (ka)", 0.7, 0.6, two_level_layers(DARBUKA.replace("{stroke}", "3"))),
        ("cajon-bass", "Cajón (grave)", 1.0, 1.0, rr_layers(CAJON.replace("{stroke}", "2"), ("pp", "mp", "f"))),
        ("cajon-slap", "Cajón (claqué)", 0.8, 1.0, rr_layers(CAJON.replace("{stroke}", "1"), ("mp", "f", "fff"))),
        ("frame-low", "Tambour sur cadre grave", 0.85, 2.0, {
            "v1": [src(FRAME.format(size="L", level=2, rr=rr), SOFT_LOWPASS_HZ) for rr in (1, 2)],
            "v2": [src(FRAME.format(size="L", level=2, rr=rr)) for rr in (1, 2)],
            "v3": [src(FRAME.format(size="L", level=3, rr=rr)) for rr in (1, 2)],
        }),
        ("frame-high", "Tambour sur cadre aigu", 0.8, 1.6, {
            "v1": [src(FRAME.format(size="S", level=2, rr=rr), SOFT_LOWPASS_HZ) for rr in (1, 2)],
            "v2": [src(FRAME.format(size="S", level=2, rr=rr)) for rr in (1, 2)],
            "v3": [src(FRAME.format(size="S", level=3, rr=rr)) for rr in (1, 2)],
        }),
        ("clap", "Frappe de mains", 0.6, 0.8,
         single_layers([f"{IDIOPHONES}/Claps/Clap_rr{rr}.wav" for rr in (1, 2)])),
    ],
}


# --- Traitement ------------------------------------------------------------


def load(vcsl, source):
    """Décode en stéréo 44,1 kHz ; un réaccordage change aussi la durée, comme une peau plus ou moins tendue."""
    filters = []
    if source["semitones"]:
        ratio = 2 ** (source["semitones"] / 12)
        filters += [f"asetrate={SAMPLE_RATE * ratio:.0f}", f"aresample={SAMPLE_RATE}"]
    if source["lowpass"]:
        filters.append(f"lowpass=f={source['lowpass']}")
    command = ["ffmpeg", "-v", "error", "-i", str(vcsl / source["path"])]
    if filters:
        command += ["-af", ",".join(filters)]
    command += ["-ac", str(CHANNELS), "-ar", str(SAMPLE_RATE), "-f", "f32le", "-"]
    raw = subprocess.run(command, check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, CHANNELS).astype(np.float64)


def trim(audio, max_seconds):
    """Commence à l'impact et coupe la queue sous -55 dB, ou à max_seconds avec un long fondu."""
    level = np.abs(audio).max(axis=1)
    peak = level.max()
    onset = max(0, int(np.argmax(level > peak * ONSET_THRESHOLD)) - int(PRE_ONSET_SECONDS * SAMPLE_RATE))
    audio = audio[onset:].copy()
    level = level[onset:]
    last = int(np.nonzero(level > peak * 10 ** (TAIL_FLOOR_DB / 20))[0][-1])
    fade = int(FADE_OUT_SECONDS * SAMPLE_RATE)
    end = min(len(audio), last + fade)
    cap = int(max_seconds * SAMPLE_RATE)
    if end > cap:
        end, fade = cap, int(cap * CAPPED_FADE_RATIO)
    audio = audio[:end]
    fade = min(fade, len(audio))
    audio[-fade:] *= np.linspace(1, 0, fade)[:, None]
    fade_in = int(FADE_IN_SECONDS * SAMPLE_RATE)
    audio[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    return audio


def write_wav(path, audio):
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(CHANNELS)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm.tobytes())


def encode(wav_path, out_base):
    common = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav_path), "-map_metadata", "-1"]
    subprocess.run(common + ["-c:a", "libvorbis", "-q:a", OGG_QUALITY, f"{out_base}.ogg"], check=True)
    subprocess.run(common + ["-c:a", "libmp3lame", "-q:a", MP3_VBR_QUALITY, f"{out_base}.mp3"], check=True)


def build_kit(kit, vcsl, sounds_root, tmp):
    out_dir = sounds_root / kit["id"]
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = {"id": kit["id"], "name": kit["name"], "sampleRate": SAMPLE_RATE, "source": "VCSL (CC0 1.0)", "pieces": []}
    credits = []
    for piece_id, name, gain, max_seconds, layers in kit["pieces"]:
        rendered = {
            (layer, index): trim(load(vcsl, source), max_seconds)
            for layer, sources in layers.items()
            for index, source in enumerate(sources, start=1)
        }
        # Un gain par couche (pas par fichier) : les variantes d'une couche gardent leur écart naturel.
        layer_peak = {
            layer: max(np.abs(audio).max() for (name, _), audio in rendered.items() if name == layer) for layer in layers
        }
        files = {layer: [] for layer in layers}
        for (layer, index), audio in rendered.items():
            file_name = f"{piece_id}-{layer}-{index}"
            wav_path = Path(tmp) / f"{file_name}.wav"
            write_wav(wav_path, audio * 10 ** (LAYER_PEAK_DB[layer] / 20) / layer_peak[layer])
            encode(wav_path, out_dir / file_name)
            files[layer].append(file_name)
            credits.append((file_name, layers[layer][index - 1]))
        manifest["pieces"].append({
            "id": piece_id,
            "name": name,
            "gain": gain,
            "velocities": [{"layer": layer, "max": LAYER_MAX[layer], "files": files[layer]} for layer in layers],
        })
        print(f"{kit['id']}/{piece_id}: {len(rendered)} sons")
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    write_credits(out_dir, kit["name"], credits)


def write_credits(out_dir, kit_name, credits):
    lines = [
        f"# Crédits du kit « {kit_name} »",
        "",
        "Tous les sons de ce dossier proviennent de la [Versilian Community Sample Library (VCSL)]"
        "(https://github.com/sgossner/VCSL), placée dans le domaine public "
        "([CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/deed.fr)). "
        "Ils ont été coupés, normalisés et convertis par `tools/sound-import/import_vcsl.py`.",
        "",
        "| Fichier | Échantillon VCSL d'origine | Traitement |",
        "| --- | --- | --- |",
    ]
    for file_name, source in credits:
        steps = []
        if source["semitones"]:
            steps.append(f"réaccordé de {source['semitones']:+g} demi-tons")
        if source["lowpass"]:
            steps.append(f"adouci (passe-bas {source['lowpass']} Hz)")
        lines.append(f"| `{file_name}` | `{source['path']}` | {', '.join(steps) or 'aucun'} |")
    (out_dir / "CREDITS.md").write_text("\n".join(lines) + "\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--vcsl", required=True, help="Dossier du clone VCSL")
    parser.add_argument("--out", default="public/sounds", help="Dossier racine des kits")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory() as tmp:
        for kit in (ACOUSTIC, WORLD):
            build_kit(kit, Path(args.vcsl), Path(args.out), tmp)


if __name__ == "__main__":
    main()
