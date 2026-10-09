// Horloge du tempo : planification « en avance » sur l'horloge audio.
// setInterval seul dérive et saute quand l'onglet est chargé ; on s'en sert
// uniquement pour réveiller la planification, et chaque pas est daté
// précisément en temps audio (technique décrite par Chris Wilson,
// « A Tale of Two Clocks »).

export const DEFAULT_BPM = 96;
export const MIN_BPM = 50;
export const MAX_BPM = 180;
export const STEPS_PER_BEAT = 4;
const LOOKAHEAD_SECONDS = 0.12;
const WAKE_INTERVAL_MS = 25;
const START_DELAY_SECONDS = 0.05;

/**
 * Ramène un tempo dans les bornes autorisées.
 * @param {number} bpm
 * @returns {number}
 */
export function clampBpm(bpm) {
  if (!Number.isFinite(bpm)) return DEFAULT_BPM;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

/**
 * Durée d'un pas (une double croche par défaut) en secondes.
 * @param {number} bpm
 * @param {number} [stepsPerBeat]
 * @returns {number}
 */
export function stepDuration(bpm, stepsPerBeat = STEPS_PER_BEAT) {
  return 60 / bpm / stepsPerBeat;
}

/**
 * Crée une horloge qui appelle `onStep(step, time, duration)` pour chaque pas,
 * un peu avant qu'il ne sonne, avec son heure exacte en temps audio.
 * @param {object} options
 * @param {{ currentTime: number }} options.context AudioContext (ou équivalent)
 * @param {(step: number, time: number, duration: number) => void} options.onStep
 * @param {number} [options.bpm]
 * @param {{ setInterval: Function, clearInterval: Function }} [options.timer] injectable pour les tests
 * @returns {{ start(): number, stop(): void, setBpm(bpm: number): void, getBpm(): number, isRunning(): boolean, tick(): void }}
 */
export function createClock({ context, onStep, bpm = DEFAULT_BPM, timer = globalThis }) {
  let currentBpm = clampBpm(bpm);
  let intervalId = null;
  let nextStep = 0;
  let nextStepTime = 0;

  function tick() {
    const horizon = context.currentTime + LOOKAHEAD_SECONDS;
    while (nextStepTime < horizon) {
      const duration = stepDuration(currentBpm);
      onStep(nextStep, nextStepTime, duration);
      nextStep += 1;
      nextStepTime += duration;
    }
  }

  return {
    /** Démarre au pas 0 ; renvoie l'heure audio du premier pas. */
    start() {
      if (intervalId !== null) return nextStepTime;
      nextStep = 0;
      nextStepTime = context.currentTime + START_DELAY_SECONDS;
      const startTime = nextStepTime;
      tick();
      intervalId = timer.setInterval(tick, WAKE_INTERVAL_MS);
      return startTime;
    },
    stop() {
      if (intervalId === null) return;
      timer.clearInterval(intervalId);
      intervalId = null;
    },
    // Le changement s'applique au pas suivant : pas de saut audible.
    setBpm(value) {
      currentBpm = clampBpm(value);
    },
    getBpm() {
      return currentBpm;
    },
    isRunning() {
      return intervalId !== null;
    },
    tick,
  };
}
