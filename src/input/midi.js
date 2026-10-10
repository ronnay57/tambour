/**
 * Entrée MIDI : un pad ou une batterie électronique branchés à l'ordinateur jouent le kit.
 * Web MIDI n'existe pas partout (Safari) : sans lui, ce module ne fait rien.
 */

const NOTE_ON = 0x90;
const STATUS_MASK = 0xf0;
const MAX_MIDI_VELOCITY = 127;

/** Notes de la norme General MIDI batterie (canal 10), vers les sons du manifest. */
const GENERAL_MIDI_DRUMS = new Map([
  [35, 'kick'],
  [36, 'kick'],
  [37, 'snare-sidestick'],
  [38, 'snare'],
  [40, 'snare-rimshot'],
  [41, 'tom-floor'],
  [42, 'hihat-closed'],
  [43, 'tom-floor'],
  [44, 'hihat-pedal'],
  [45, 'tom-mid'],
  [46, 'hihat-open'],
  [47, 'tom-mid'],
  [48, 'tom-high'],
  [49, 'crash'],
  [50, 'tom-high'],
  [51, 'ride'],
  [53, 'ride-bell'],
  [55, 'splash'],
  [56, 'cowbell'],
  [57, 'crash'],
  [59, 'ride'],
]);

/**
 * @typedef {import('./keyboard.js').Hit} Hit
 */

/**
 * Indique si l'utilisateur a déjà autorisé le MIDI, pour s'y connecter sans lui reposer la question.
 * @returns {Promise<boolean>}
 */
export async function isMidiAllowed() {
  if (!navigator.requestMIDIAccess) return false;
  try {
    const status = await navigator.permissions.query({ name: 'midi' });
    return status.state === 'granted';
  } catch {
    return false;
  }
}

/**
 * Écoute les appareils MIDI branchés, y compris ceux branchés plus tard.
 * Peut afficher une demande d'autorisation du navigateur : à appeler après un geste de l'utilisateur.
 * @param {(hit: Hit) => void} onHit Appelé à chaque note de batterie reconnue.
 * @returns {Promise<boolean>} Vrai si le MIDI est actif.
 */
export async function listenToMidi(onHit) {
  if (!navigator.requestMIDIAccess) return false;
  let access;
  try {
    access = await navigator.requestMIDIAccess();
  } catch {
    // Refusé par l'utilisateur ou par le navigateur : le reste du kit fonctionne sans.
    return false;
  }

  function handleMessage({ data }) {
    const [status, note, velocity] = data;
    // Un note-on de vélocité 0 vaut un note-off, d'après la norme MIDI.
    if ((status & STATUS_MASK) !== NOTE_ON || velocity === 0) return;
    const pieceId = GENERAL_MIDI_DRUMS.get(note);
    if (pieceId) onHit({ pieceId, velocity: velocity / MAX_MIDI_VELOCITY });
  }

  function listenToInputs() {
    for (const input of access.inputs.values()) input.onmidimessage = handleMessage;
  }

  listenToInputs();
  access.onstatechange = listenToInputs;
  return true;
}
