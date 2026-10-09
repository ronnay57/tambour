/**
 * Affichage du kit : crée une zone de frappe par pièce et déclenche son animation.
 *
 * Ce module ne joue aucun son et n'écoute aucune entrée : `main.js` relie l'événement `hit`
 * des modules `input/*` au moteur audio et à `animateHit`. Les entrées retrouvent la pièce
 * touchée grâce à l'attribut `data-piece-id`.
 */

import { getPieceLayout, hasDedicatedLayout, isCompactKit } from './kit-layout.js';
import { playHitAnimation } from './hit-animation.js';

const DEFAULT_VELOCITY = 0.8;
const KICK_LOGO_TEXT = 'Tambour';
const CENTER = 0.5;
/** Nombre de tirants par type de fût ; les cymbales n'en ont pas. */
const LUG_COUNTS = { drum: 6, snare: 10, kick: 10 };

/**
 * @typedef {import('../audio/kits.js').Kit} Kit
 * @typedef {import('../audio/kits.js').Piece} Piece
 */

/**
 * Dessine le kit dans le conteneur, en remplaçant un éventuel kit précédent.
 * @param {HTMLElement} container Élément `#drum-kit`.
 * @param {Kit} kit
 * @param {Map<string, string>} [keyLabels] Touche affichée par pièce (voir `input/keyboard.js`).
 * @returns {void}
 */
export function renderDrumKit(container, kit, keyLabels = new Map()) {
  container.dataset.kitId = kit.id;
  container.setAttribute('aria-label', `Kit : ${kit.name}`);

  const floor = createElement('div', 'drum-kit__floor');
  floor.setAttribute('aria-hidden', 'true');

  const compact = isCompactKit(kit.pieces.map((piece) => piece.id));
  const unknownPieces = kit.pieces.filter((piece) => !hasDedicatedLayout(piece.id));
  const pieces = kit.pieces.map((piece) =>
    createPieceElement(piece, keyLabels.get(piece.id) ?? '', {
      compact,
      fallbackIndex: unknownPieces.indexOf(piece),
      fallbackCount: unknownPieces.length,
    }),
  );
  container.replaceChildren(floor, ...pieces);
}

/**
 * Anime la frappe d'une pièce : compression de la peau, onde depuis le point d'impact,
 * lueur proportionnelle à la vélocité. Sans effet si la pièce n'est pas affichée.
 * @param {HTMLElement} container Conteneur passé à `renderDrumKit`.
 * @param {string} pieceId
 * @param {number} [velocity] Force de la frappe, de 0 à 1.
 * @param {{ x?: number, y?: number }} [point] Point d'impact dans la pièce, de 0 à 1 ;
 *   le centre par défaut (frappe au clavier).
 * @returns {void}
 */
export function animateHit(container, pieceId, velocity = DEFAULT_VELOCITY, point = {}) {
  const element = container.querySelector(`[data-piece-id="${CSS.escape(pieceId)}"]`);
  if (!element) return;
  const { x = CENTER, y = CENTER } = point;
  playHitAnimation(
    element,
    clamp(velocity, 0, 1),
    { x, y },
    container.querySelector('.drum-kit__floor'),
  );
}

/**
 * @param {Piece} piece
 * @param {string} keyLabel
 * @param {{ compact: boolean, fallbackIndex: number, fallbackCount: number }} options
 * @returns {HTMLElement}
 */
function createPieceElement(piece, keyLabel, { compact, fallbackIndex, fallbackCount }) {
  const { look, landscape, portrait, lugs } = getPieceLayout(
    piece.id,
    fallbackIndex,
    fallbackCount,
    compact,
  );

  const element = createElement('button', `piece piece--${look}`);
  element.type = 'button';
  element.dataset.pieceId = piece.id;
  element.dataset.look = look;
  // Le clavier joue déjà les pièces : le bouton ne doit pas voler le focus ni la touche Espace.
  element.tabIndex = -1;
  element.setAttribute('aria-label', keyLabel ? `${piece.name} (touche ${keyLabel})` : piece.name);
  setPlacement(element, 'l', landscape);
  setPlacement(element, 'p', portrait);

  const body = createElement('span', 'piece__body');
  const head = createElement('span', 'piece__head');
  head.append(createElement('span', 'piece__ripples'), createElement('span', 'piece__glow'));
  body.append(...createLugs(lugs ?? LUG_COUNTS[look] ?? 0), head);

  if (look === 'kick') {
    const logo = createElement('span', 'piece__logo');
    logo.textContent = KICK_LOGO_TEXT;
    head.append(logo);
  }

  const label = createElement('span', 'piece__label');
  label.setAttribute('aria-hidden', 'true');
  const name = createElement('span', 'piece__name');
  name.textContent = piece.name;
  label.append(name);
  if (keyLabel) {
    const key = createElement('kbd', 'piece__key');
    key.textContent = keyLabel;
    label.append(key);
  }

  element.append(body, label);
  return element;
}

/**
 * Crée les tirants répartis sur le cercle d'un fût.
 * @param {number} count
 * @returns {HTMLElement[]}
 */
function createLugs(count) {
  return Array.from({ length: count }, (_, index) => {
    const lug = createElement('span', 'piece__lug');
    lug.setAttribute('aria-hidden', 'true');
    // Décalage d'un demi-pas : aucun tirant ne tombe pile en haut, sous le nom de la pièce.
    lug.style.setProperty('--angle', `${((index + 0.5) * 360) / count}deg`);
    return lug;
  });
}

/**
 * @param {HTMLElement} element
 * @param {'l' | 'p'} suffix
 * @param {import('./kit-layout.js').Placement} placement
 */
function setPlacement(element, suffix, { x, y, size }) {
  element.style.setProperty(`--x-${suffix}`, `${x}%`);
  element.style.setProperty(`--y-${suffix}`, `${y}%`);
  element.style.setProperty(`--size-${suffix}`, `${size}%`);
}

/**
 * @param {string} tag
 * @param {string} className
 * @returns {HTMLElement}
 */
function createElement(tag, className) {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : max));
}
