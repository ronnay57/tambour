// Enregistrement de ce qu'on joue, sous forme d'une liste de frappes datées.
// Garder les frappes plutôt que le son permet de les réécouter sans perte,
// avec un autre kit si on veut, pour un poids négligeable.

const LOOKAHEAD_SECONDS = 0.12;
const WAKE_INTERVAL_MS = 25;
const PLAYBACK_DELAY_SECONDS = 0.05;
export const MAX_RECORDING_SECONDS = 600;

/**
 * @typedef {object} RecordedHit
 * @property {number} time  secondes depuis le début de l'enregistrement
 * @property {string} pieceId
 * @property {number} velocity
 */

/**
 * @typedef {object} Recording
 * @property {RecordedHit[]} hits
 * @property {number} duration  en secondes
 * @property {object} meta  contexte libre au moment de l'enregistrement (kit, boucle, tempo…)
 */

/**
 * Crée l'enregistreur.
 * @param {object} options
 * @param {{ currentTime: number }} options.context
 * @param {(pieceId: string, velocity: number, when: number) => void} options.play  déclenche un son à une heure audio
 * @param {object} [options.timer]  injectable pour les tests
 */
export function createRecorder({ context, play, timer = globalThis }) {
  let recordStart = null;
  let recordMeta = {};
  let hits = [];
  let playback = null;

  function stopPlaybackTimer() {
    if (!playback) return;
    timer.clearInterval(playback.intervalId);
    timer.clearTimeout(playback.endTimeoutId);
    playback = null;
  }

  return {
    /**
     * Commence un nouvel enregistrement (l'éventuel précédent est oublié).
     * @param {object} [meta]
     * @returns {number} heure audio du début
     */
    startRecording(meta = {}) {
      recordStart = context.currentTime;
      recordMeta = meta;
      hits = [];
      return recordStart;
    },
    isRecording() {
      return recordStart !== null;
    },
    /**
     * Note une frappe si l'enregistrement est en cours.
     * @param {{ pieceId: string, velocity: number }} hit
     */
    capture({ pieceId, velocity }) {
      if (recordStart === null) return;
      const time = context.currentTime - recordStart;
      if (time > MAX_RECORDING_SECONDS) return;
      hits.push({ time, pieceId, velocity });
    },
    /**
     * Termine l'enregistrement.
     * @returns {Recording|null}
     */
    stopRecording() {
      if (recordStart === null) return null;
      const duration = Math.min(context.currentTime - recordStart, MAX_RECORDING_SECONDS);
      recordStart = null;
      return { hits: [...hits], duration, meta: recordMeta };
    },
    /**
     * Rejoue un enregistrement.
     * @param {Recording} recording
     * @param {object} [options]
     * @param {number} [options.startAt]  heure audio de départ (pour se caler sur une boucle)
     * @param {() => void} [options.onEnd]  appelé à la fin naturelle de la réécoute
     * @returns {number} heure audio de départ
     */
    startPlayback(recording, { startAt, onEnd } = {}) {
      stopPlaybackTimer();
      const origin = startAt ?? context.currentTime + PLAYBACK_DELAY_SECONDS;
      let index = 0;
      const tick = () => {
        const horizon = context.currentTime + LOOKAHEAD_SECONDS;
        while (index < recording.hits.length && origin + recording.hits[index].time < horizon) {
          const hit = recording.hits[index];
          play(hit.pieceId, hit.velocity, origin + hit.time);
          index += 1;
        }
      };
      tick();
      const remainingMs = Math.max(0, origin + recording.duration - context.currentTime) * 1000;
      playback = {
        intervalId: timer.setInterval(tick, WAKE_INTERVAL_MS),
        endTimeoutId: timer.setTimeout(() => {
          stopPlaybackTimer();
          onEnd?.();
        }, remainingMs),
      };
      return origin;
    },
    stopPlayback() {
      stopPlaybackTimer();
    },
    isPlayingBack() {
      return playback !== null;
    },
  };
}
