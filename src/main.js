/**
 * Point d'entrée : assemble l'interface, les entrées et le moteur audio.
 */

import { renderDrumKit, animateHit } from './ui/drum-kit.js';
import { initTheme } from './ui/theme.js';
import { PREVIEW_KIT } from './ui/preview-kit.js';

const kitContainer = document.querySelector('#drum-kit');
const themeToggle = document.querySelector('#theme-toggle');

initTheme(themeToggle);
renderDrumKit(kitContainer, PREVIEW_KIT);

/*
 * Entrées d'aperçu, le temps que `input/keyboard.js` et `input/pointer.js` arrivent avec le
 * prototype jouable : elles seules déclencheront alors `animateHit` et le moteur audio.
 */
const PREVIEW_VELOCITY = 0.8;
const keyToPiece = new Map(PREVIEW_KIT.pieces.map((piece) => [piece.key, piece.id]));

kitContainer.addEventListener('pointerdown', (event) => {
  const piece = event.target.closest('[data-piece-id]');
  if (!piece) return;
  event.preventDefault();
  animateHit(piece.dataset.pieceId, PREVIEW_VELOCITY, {
    x: event.clientX,
    y: event.clientY,
  });
});

window.addEventListener('keydown', (event) => {
  const pieceId = keyToPiece.get(event.key.toLowerCase());
  if (!pieceId || event.repeat) return;
  event.preventDefault();
  animateHit(pieceId, PREVIEW_VELOCITY);
});
