// Boucles d'accompagnement et métronome, calés sur une même horloge.

import { createClock, DEFAULT_BPM } from './clock.js';
import { describeStep, findPattern, STEPS_PER_BAR } from './patterns.js';
import { playBass, playClick, playPad, playShaker } from './synth.js';

export const DEFAULT_LOOP_VOLUME = 0.8;
export const DEFAULT_CLICK_VOLUME = 0.6;
const FADE_OUT_SECONDS = 0.15;
const BASS_GATE = 0.9;
const MAX_PENDING_BEATS = 16;
const MIN_DRUM_VELOCITY = 0.05;

/**
 * Crée le lecteur d'accompagnement.
 * @param {object} options
 * @param {BaseAudioContext} options.context
 * @param {AudioNode} options.output  sortie maître (volume général)
 * @param {(pieceId: string, velocity: number, when: number) => void} [options.playPiece]
 *   frappe une pièce du kit courant (moteur audio) pour la partie batterie
 * @param {number} [options.bpm]
 * @param {string|null} [options.patternId]  `null` : métronome seul
 * @param {object} [options.timer]  injectable pour les tests
 * @returns {object} voir les méthodes ci-dessous
 */
export function createLoopPlayer({ context, output, bpm = DEFAULT_BPM, patternId = null, playPiece, timer = globalThis }) {
  const loopBus = context.createGain();
  loopBus.gain.value = DEFAULT_LOOP_VOLUME;
  loopBus.connect(output);
  const clickBus = context.createGain();
  clickBus.gain.value = DEFAULT_CLICK_VOLUME;
  clickBus.connect(output);

  let pattern = patternId ? (findPattern(patternId) ?? null) : null;
  let metronome = false;
  let drums = true;
  let loopVolume = DEFAULT_LOOP_VOLUME;
  let session = null;
  let startTime = null;
  let pendingBeats = [];

  function onStep(step, time, duration) {
    if (step % 4 === 0) {
      pendingBeats.push({ beat: (step / 4) % (STEPS_PER_BAR / 4), time });
      if (pendingBeats.length > MAX_PENDING_BEATS) pendingBeats.shift();
    }
    if (metronome && step % 4 === 0) {
      playClick(context, session.click, step % STEPS_PER_BAR === 0, time);
    }
    if (!pattern) return;
    const info = describeStep(pattern, step);
    if (info.barStart) playPad(context, session.loop, info.chord, time, duration * STEPS_PER_BAR, pattern.tone);
    if (info.bassNote !== null) {
      playBass(context, session.loop, info.bassNote, time, duration * bassLength(step) * BASS_GATE, pattern.tone);
    }
    playShaker(context, session.loop, info.shaker, time);
    // La batterie passe par le moteur, hors du bus des boucles : le volume
    // des boucles s'applique donc via la vélocité.
    if (drums && playPiece) {
      for (const hit of info.drums) {
        const velocity = hit.velocity * loopVolume;
        if (velocity >= MIN_DRUM_VELOCITY) playPiece(hit.pieceId, velocity, time);
      }
    }
  }

  // Une note de basse dure jusqu'à la suivante (dans la mesure).
  function bassLength(step) {
    const stepInBar = step % STEPS_PER_BAR;
    let length = 1;
    while (stepInBar + length < STEPS_PER_BAR && pattern.bass[stepInBar + length] === null) length += 1;
    return length;
  }

  const clock = createClock({ context, onStep, bpm, timer });

  // Chaque lecture passe par ses propres gains : à l'arrêt on les fait taire
  // en fondu, ce qui coupe aussi les notes déjà planifiées.
  function openSession() {
    const loop = context.createGain();
    loop.connect(loopBus);
    const click = context.createGain();
    click.connect(clickBus);
    return { loop, click };
  }

  function closeSession(current) {
    const now = context.currentTime;
    for (const node of [current.loop, current.click]) {
      node.gain.setValueAtTime(node.gain.value, now);
      node.gain.linearRampToValueAtTime(0, now + FADE_OUT_SECONDS);
    }
    timer.setTimeout(() => disconnect(current), FADE_OUT_SECONDS * 2 * 1000);
  }

  function disconnect(current) {
    current.loop.disconnect();
    current.click.disconnect();
  }

  return {
    /**
     * Lance la boucle (et/ou le métronome) au début d'une mesure.
     * @returns {number} heure audio du premier temps
     */
    start() {
      if (clock.isRunning()) return startTime;
      session = openSession();
      pendingBeats = [];
      startTime = clock.start();
      return startTime;
    },
    stop() {
      if (!clock.isRunning()) return;
      clock.stop();
      closeSession(session);
      session = null;
      startTime = null;
      pendingBeats = [];
    },
    isPlaying() {
      return clock.isRunning();
    },
    /** Heure audio du premier temps de la lecture en cours, ou `null`. */
    getStartTime() {
      return startTime;
    },
    /** @param {number} value */
    setBpm(value) {
      clock.setBpm(value);
    },
    getBpm() {
      return clock.getBpm();
    },
    /**
     * Change d'ambiance ; prend effet au pas suivant. `null` coupe la boucle
     * (le métronome continue s'il est actif).
     * @param {string|null} id
     */
    setPattern(id) {
      pattern = id ? (findPattern(id) ?? null) : null;
    },
    getPatternId() {
      return pattern?.id ?? null;
    },
    /** @param {boolean} enabled */
    setMetronome(enabled) {
      metronome = Boolean(enabled);
    },
    isMetronomeOn() {
      return metronome;
    },
    /** @param {boolean} enabled  batterie dans la boucle */
    setDrums(enabled) {
      drums = Boolean(enabled);
    },
    hasDrums() {
      return drums;
    },
    /** @param {number} value  volume des boucles, de 0 à 1 */
    setLoopVolume(value) {
      loopVolume = value;
      loopBus.gain.setTargetAtTime(value, context.currentTime, 0.02);
    },
    /**
     * Temps en cours dans la mesure (0 à 3), pour l'affichage, ou `null`.
     * @returns {number|null}
     */
    getCurrentBeat() {
      const now = context.currentTime;
      let current = null;
      for (const entry of pendingBeats) {
        if (entry.time <= now) current = entry.beat;
      }
      return current;
    },
  };
}
