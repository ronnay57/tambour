/**
 * Point d'entrée : relie entrées, moteur audio et interface.
 */

import './styles/tokens.css';
import './styles/main.css';
import { createEngine } from './audio/engine.js';
import { KITS } from './audio/kits.js';
import { getKeyLabels, listenToKeyboard } from './input/keyboard.js';
import { isMidiAllowed, listenToMidi } from './input/midi.js';
import { listenToPointer } from './input/pointer.js';
import { setupMusic } from './music.js';
import { animateHit, renderDrumKit } from './ui/drum-kit.js';
import { initTheme } from './ui/theme.js';

const kit = KITS[0];
const kitElement = document.querySelector('#drum-kit');
const hintElement = document.querySelector('#hint');

initTheme(document.querySelector('#theme-toggle'));

// BASE_URL suit la configuration Vite, pour que les sons se trouvent aussi sous /tambour/.
const engine = createEngine({ soundsUrl: `${import.meta.env.BASE_URL}sounds/` });
const music = setupMusic({ engine, kits: KITS, root: document.querySelector('#transport') });

/** @param {import('./input/keyboard.js').Hit} hit */
function handleHit(hit) {
  // Le son passe avant l'animation : c'est lui dont on perçoit le retard.
  engine.play(hit.pieceId, hit.velocity);
  music.captureHit(hit);
  animateHit(kitElement, hit.pieceId, hit.velocity, hit);
}

let midiStarted = false;
function startMidi() {
  midiStarted = true;
  listenToMidi(handleHit);
}

// Le navigateur n'autorise le son qu'après un geste, en capture pour passer avant la frappe.
// L'écoute reste en place : iOS resuspend le contexte après un verrouillage d'écran ou un
// appel, et seul un nouveau geste peut le relancer.
function unlockAudio() {
  if (engine.context.state !== 'running') engine.unlock();
  // La demande d'autorisation MIDI attend aussi un geste, pour ne pas surgir au chargement.
  if (!midiStarted) startMidi();
  hintElement.hidden = true;
}
window.addEventListener('pointerdown', unlockAudio, true);
window.addEventListener('keydown', unlockAudio, true);

// Accès depuis la console pour essayer le moteur (ex. : tambour.engine.play('snare')).
window.tambour = { engine, kit };

let stopKeyboard = null;
/** Affiche un kit et relie ses touches ; appelé à nouveau à chaque changement de kit. */
async function showKit(shownKit) {
  renderDrumKit(kitElement, shownKit, await getKeyLabels(shownKit));
  stopKeyboard?.();
  stopKeyboard = listenToKeyboard(shownKit, handleHit);
  window.tambour.kit = shownKit;
}

await showKit(kit);
listenToPointer(kitElement, handleHit);
music.onKitChange(showKit);
music.selectKit(music.getPreferredKitId() ?? kit.id);
if (await isMidiAllowed()) startMidi();
