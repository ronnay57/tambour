/**
 * Point d'entrée : relie entrées, moteur audio et interface.
 */

import './styles/tokens.css';
import './styles/main.css';
import { createEngine } from './audio/engine.js';
import { KITS } from './audio/kits.js';
import { getKeyLabels, listenToKeyboard } from './input/keyboard.js';
import { listenToPointer } from './input/pointer.js';
import { animateHit, renderDrumKit } from './ui/drum-kit.js';

const kit = KITS[0];
const kitElement = document.querySelector('#drum-kit');
const hintElement = document.querySelector('#hint');

// BASE_URL suit la configuration Vite, pour que les sons se trouvent aussi sous /tambour/.
const engine = createEngine({ soundsUrl: `${import.meta.env.BASE_URL}sounds/` });

/** @param {import('./input/keyboard.js').Hit} hit */
function handleHit(hit) {
  // Le son passe avant l'animation : c'est lui dont on perçoit le retard.
  engine.play(hit.pieceId, hit.velocity);
  animateHit(kitElement, hit.pieceId, hit.velocity, hit);
}

// Le navigateur n'autorise le son qu'après un geste : on débloque au tout premier appui,
// en capture pour passer avant la frappe elle-même.
function unlockAudio() {
  engine.unlock();
  hintElement.hidden = true;
  window.removeEventListener('pointerdown', unlockAudio, true);
  window.removeEventListener('keydown', unlockAudio, true);
}
window.addEventListener('pointerdown', unlockAudio, true);
window.addEventListener('keydown', unlockAudio, true);

renderDrumKit(kitElement, kit, await getKeyLabels(kit));
listenToPointer(kitElement, handleHit);
listenToKeyboard(kit, handleHit);
engine.loadKit(kit);

// Accès depuis la console pour essayer le moteur (ex. : tambour.engine.play('snare')).
window.tambour = { engine, kit };
