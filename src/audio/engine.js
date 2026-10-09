/**
 * Moteur audio : contexte Web Audio, chargement des sons et lecture.
 *
 * Ne touche jamais au DOM. L'interface, les entrées et les boucles l'appellent ; lui
 * n'appelle personne.
 */

import { loadKitSamples } from './sample-loader.js';
import { renderSynthSound } from './drum-synth.js';
import { createReverb } from './reverb.js';

const DEFAULT_VOLUME = 0.8;
/** Réverbération discrète par défaut : elle doit unifier le kit sans le noyer. */
const DEFAULT_REVERB_MIX = 0.12;
/** Au-delà, la frappe la plus ancienne d'un son est coupée, pour ne pas saturer sur une cymbale. */
const MAX_VOICES_PER_SOUND = 6;
/** Fondu appliqué quand on coupe une voix : inaudible, mais évite un clic. */
const VOICE_FADE_SECONDS = 0.015;
/** Variation aléatoire de hauteur entre deux frappes, contre l'effet « mitraillette ». */
const PITCH_VARIATION = 0.008;
/** Temps de lissage d'un changement de volume, pour éviter un claquement. */
const VOLUME_SMOOTHING_SECONDS = 0.01;

/**
 * @typedef {import('./kits.js').Kit} Kit
 * @typedef {import('./sample-loader.js').Sound} Sound
 */

/**
 * @typedef {object} DrumEngine
 * @property {AudioContext} context Contexte audio partagé (boucles, enregistrement…).
 * @property {GainNode} output Volume général ; tout ce qui doit sonner se branche dessus.
 * @property {() => Promise<void>} unlock À appeler dans un geste de l'utilisateur pour autoriser le son.
 * @property {(kit: Kit) => Promise<void>} loadKit Prépare un kit. Les pièces sont jouables dès
 *   l'appel (sons de synthèse) ; la promesse se résout quand les vrais sons sont chargés.
 * @property {(soundId: string, velocity?: number, time?: number) => void} play Déclenche un son
 *   du kit. `velocity` : force de 0 à 1 (1 par défaut). `time` : instant en secondes sur
 *   l'horloge de `now()` ; absent ou déjà passé, le son part tout de suite.
 * @property {(soundId: string, time?: number) => void} stop Coupe les frappes en cours d'un son.
 * @property {() => number} now Heure de l'horloge audio, en secondes.
 * @property {() => string[]} listSounds Sons jouables, y compris ceux sans pièce affichée.
 * @property {(volume: number) => void} setVolume Règle le volume général (0 à 1).
 * @property {(mix: number) => void} setReverb Règle la part de réverbération du kit (0 à 1, 0 = sans).
 */

/** Son de synthèse : une seule couche, la vélocité ne joue que sur le volume. */
function createSynthSound(context, recipe) {
  return {
    gain: 1,
    minGain: 0,
    layers: [{ max: 1, buffers: [renderSynthSound(context, recipe)] }],
  };
}

/** Volume d'une frappe : gain de mixage, modulé selon la place de la vélocité dans sa couche. */
function computeGain(sound, layerIndex, velocity) {
  const floor = layerIndex > 0 ? sound.layers[layerIndex - 1].max : 0;
  const position = (velocity - floor) / (sound.layers[layerIndex].max - floor);
  // Au carré : l'oreille perçoit le volume de façon logarithmique.
  return sound.gain * (sound.minGain + (1 - sound.minGain) * position * position);
}

function fadeOut(voice, time) {
  voice.gain.gain.setTargetAtTime(0, time, VOICE_FADE_SECONDS / 3);
  voice.source.stop(time + VOICE_FADE_SECONDS);
}

/**
 * Crée le moteur audio.
 * @param {object} [options]
 * @param {string} [options.soundsUrl='sounds/'] Adresse du dossier qui contient un sous-dossier par kit.
 * @returns {DrumEngine}
 */
export function createEngine({ soundsUrl = 'sounds/' } = {}) {
  // « interactive » demande au navigateur le plus petit tampon audio qu'il sait tenir.
  const context = new AudioContext({ latencyHint: 'interactive' });
  const output = context.createGain();
  output.gain.value = DEFAULT_VOLUME;
  output.connect(context.destination);
  // Les frappes passent par un bus du kit, envoyé en direct et vers la réverbération.
  const kitBus = context.createGain();
  kitBus.connect(output);
  const reverb = createReverb(context, output, DEFAULT_REVERB_MIX);
  kitBus.connect(reverb.input);

  /** @type {Map<string, Sound>} */
  let sounds = new Map();
  /** @type {Record<string, string[]>} */
  let chokes = {};
  /** Dernière variante jouée par couche, pour ne pas rejouer la même deux fois d'affilée. */
  const lastVariant = new WeakMap();
  /** @type {Map<string, {source: AudioBufferSourceNode, gain: GainNode}[]>} */
  const voices = new Map();

  function unlock() {
    // iOS ne libère vraiment l'audio qu'après un son joué dans le geste lui-même.
    const silence = context.createBufferSource();
    silence.buffer = context.createBuffer(1, 1, context.sampleRate);
    silence.connect(kitBus);
    silence.start();
    return context.state === 'running' ? Promise.resolve() : context.resume();
  }

  async function loadKit(kit) {
    // La synthèse est prête tout de suite : le kit est jouable sans attendre le réseau.
    const kitSounds = new Map(
      kit.pieces.map((piece) => [piece.id, createSynthSound(context, piece.synth)]),
    );
    sounds = kitSounds;
    chokes = kit.chokes ?? {};
    await loadKitSamples(context, `${soundsUrl}${kit.id}/`, (id, sound) =>
      kitSounds.set(id, sound),
    );
  }

  function pickBuffer(layer) {
    const count = layer.buffers.length;
    const previous = lastVariant.get(layer) ?? -1;
    let index = Math.floor(Math.random() * count);
    if (count > 1 && index === previous) index = (index + 1) % count;
    lastVariant.set(layer, index);
    return layer.buffers[index];
  }

  function stop(soundId, time = context.currentTime) {
    const soundVoices = voices.get(soundId) ?? [];
    // On vide la liste : une voix ne doit recevoir qu'un seul stop().
    for (const voice of soundVoices.splice(0)) fadeOut(voice, time);
  }

  function play(soundId, velocity = 1, time = 0) {
    const sound = sounds.get(soundId);
    if (!sound) return;
    const clamped = Math.min(1, Math.max(0, velocity));
    const startTime = Math.max(time, context.currentTime);
    const layerIndex = sound.layers.findIndex((layer) => clamped <= layer.max);

    for (const choked of chokes[soundId] ?? []) stop(choked, startTime);

    const source = context.createBufferSource();
    source.buffer = pickBuffer(sound.layers[layerIndex]);
    source.playbackRate.value = 1 + (Math.random() * 2 - 1) * PITCH_VARIATION;
    const gain = context.createGain();
    gain.gain.value = computeGain(sound, layerIndex, clamped);
    source.connect(gain).connect(kitBus);
    source.start(startTime);

    const voice = { source, gain };
    const soundVoices = voices.get(soundId) ?? [];
    soundVoices.push(voice);
    voices.set(soundId, soundVoices);
    if (soundVoices.length > MAX_VOICES_PER_SOUND) fadeOut(soundVoices.shift(), startTime);
    source.onended = () => {
      const index = soundVoices.indexOf(voice);
      if (index !== -1) soundVoices.splice(index, 1);
      gain.disconnect();
    };
  }

  return {
    context,
    output,
    unlock,
    loadKit,
    play,
    stop,
    now: () => context.currentTime,
    listSounds: () => [...sounds.keys()],
    setReverb: reverb.setMix,
    setVolume: (volume) =>
      output.gain.setTargetAtTime(volume, context.currentTime, VOLUME_SMOOTHING_SECONDS),
  };
}
