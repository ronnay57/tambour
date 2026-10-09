/**
 * Affichage du kit : crée une zone de frappe par pièce et déclenche son animation.
 *
 * Ce module ne joue aucun son et n'écoute aucune entrée : `main.js` relie l'événement `hit`
 * des modules `input/*` au moteur audio et à `animateHit`. Les entrées retrouvent la pièce
 * touchée grâce à l'attribut `data-piece-id`.
 */

import { getPieceLayout, hasDedicatedLayout } from './kit-layout.js';
import { playHitAnimation } from './hit-animation.js';

const DEFAULT_VELOCITY = 0.8;
const KICK_LOGO_TEXT = 'Tambour';
const KEY_LABELS = { ' ': 'Espace', Space: 'Espace', Enter: 'Entrée' };

/** @type {Map<string, HTMLElement>} */
const pieceElements = new Map();
/** @type {HTMLElement | null} */
let floorElement = null;

/**
 * @typedef {object} KitPiece
 * @property {string} id Identifiant stable, partagé avec le moteur audio.
 * @property {string} name Nom affiché.
 * @property {string} [key] Touche clavier associée, affichée sur la pièce.
 */

/**
 * @typedef {object} Kit
 * @property {string} id
 * @property {string} name
 * @property {KitPiece[]} pieces
 */

/**
 * Dessine le kit dans le conteneur, en remplaçant un éventuel kit précédent.
 * @param {HTMLElement} container Élément `#drum-kit`.
 * @param {Kit} kit
 * @returns {void}
 */
export function renderDrumKit(container, kit) {
  pieceElements.clear();
  container.replaceChildren();
  container.dataset.kitId = kit.id;
  container.setAttribute('aria-label', `Kit : ${kit.name}`);

  floorElement = createElement('div', 'drum-kit__floor');
  floorElement.setAttribute('aria-hidden', 'true');
  container.append(floorElement);

  const unknownPieces = kit.pieces.filter((piece) => !hasDedicatedLayout(piece.id));
  for (const piece of kit.pieces) {
    const element = createPieceElement(piece, unknownPieces.indexOf(piece), unknownPieces.length);
    pieceElements.set(piece.id, element);
    container.append(element);
  }
}

/**
 * Anime la frappe d'une pièce : compression de la peau, onde depuis le point d'impact,
 * lueur proportionnelle à la vélocité. Sans effet si la pièce n'est pas affichée.
 * @param {string} pieceId
 * @param {number} [velocity] Force de la frappe, de 0 à 1.
 * @param {{ x: number, y: number }} [point] Point d'impact en coordonnées client ; le centre par défaut.
 * @returns {void}
 */
export function animateHit(pieceId, velocity = DEFAULT_VELOCITY, point) {
  const element = pieceElements.get(pieceId);
  if (!element) return;
  playHitAnimation(element, clamp(velocity, 0, 1), point, floorElement);
}

/**
 * Renvoie l'élément d'une pièce affichée, par exemple pour y attacher un retour visuel.
 * @param {string} pieceId
 * @returns {HTMLElement | undefined}
 */
export function getPieceElement(pieceId) {
  return pieceElements.get(pieceId);
}

/**
 * @param {KitPiece} piece
 * @param {number} fallbackIndex
 * @param {number} fallbackCount
 * @returns {HTMLElement}
 */
function createPieceElement(piece, fallbackIndex, fallbackCount) {
  const { look, landscape, portrait } = getPieceLayout(piece.id, fallbackIndex, fallbackCount);

  // Un bouton rend la pièce atteignable au clavier et lisible par les lecteurs d'écran.
  const element = createElement('button', `piece piece--${look}`);
  element.type = 'button';
  element.dataset.pieceId = piece.id;
  element.dataset.look = look;
  const keyLabel = piece.key ? formatKey(piece.key) : '';
  element.setAttribute('aria-label', keyLabel ? `${piece.name} (touche ${keyLabel})` : piece.name);
  setPlacement(element, 'l', landscape);
  setPlacement(element, 'p', portrait);

  const body = createElement('span', 'piece__body');
  const head = createElement('span', 'piece__head');
  head.append(createElement('span', 'piece__ripples'), createElement('span', 'piece__glow'));
  body.append(head);

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

/**
 * Libellé lisible d'une touche (`' '` devient « Espace »).
 * @param {string} key
 * @returns {string}
 */
function formatKey(key) {
  return KEY_LABELS[key] ?? key.toUpperCase();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : max));
}
