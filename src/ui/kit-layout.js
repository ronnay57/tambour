/**
 * Placement et apparence des pièces sur la scène, en vue de dessus.
 *
 * Les positions sont en pourcentage de la scène (x en largeur, y en hauteur) et la taille en
 * pourcentage de la largeur. Deux dispositions : paysage (scène 2:1) et portrait (scène 0,55:1),
 * calculées pour que les pièces ne se chevauchent pas et gardent au moins 64 px sur téléphone.
 */

/** @typedef {'drum' | 'snare' | 'kick' | 'cymbal' | 'hihat'} PieceLook */

/**
 * @typedef {object} Placement
 * @property {number} x Centre horizontal, en % de la largeur de la scène.
 * @property {number} y Centre vertical, en % de la hauteur de la scène.
 * @property {number} size Diamètre, en % de la largeur de la scène.
 */

/**
 * @typedef {object} PieceLayout
 * @property {PieceLook} look Matière et animation de la pièce.
 * @property {Placement} landscape
 * @property {Placement} portrait
 */

/** @type {Record<string, PieceLayout>} */
export const PIECE_LAYOUTS = {
  hihat: {
    look: 'hihat',
    landscape: { x: 12, y: 52, size: 15 },
    portrait: { x: 16, y: 55, size: 28 },
  },
  crash: {
    look: 'cymbal',
    landscape: { x: 22, y: 20, size: 18 },
    portrait: { x: 22, y: 13, size: 34 },
  },
  'tom-high': {
    look: 'drum',
    landscape: { x: 39, y: 32, size: 13 },
    portrait: { x: 36, y: 35, size: 25 },
  },
  'tom-mid': {
    look: 'drum',
    landscape: { x: 55, y: 32, size: 14 },
    portrait: { x: 64, y: 35, size: 26 },
  },
  ride: {
    look: 'cymbal',
    landscape: { x: 82, y: 30, size: 20 },
    portrait: { x: 78, y: 15, size: 36 },
  },
  snare: {
    look: 'snare',
    landscape: { x: 28, y: 68, size: 16 },
    portrait: { x: 44, y: 62, size: 30 },
  },
  kick: {
    look: 'kick',
    landscape: { x: 48, y: 76, size: 20 },
    portrait: { x: 50, y: 86, size: 36 },
  },
  'tom-low': {
    look: 'drum',
    landscape: { x: 67, y: 66, size: 17 },
    portrait: { x: 78, y: 62, size: 32 },
  },
};

/** Alias courants, pour suivre les ids choisis par `audio/kits.js` sans dupliquer les placements. */
const ID_ALIASES = {
  'hi-hat': 'hihat',
  'hihat-closed': 'hihat',
  'hihat-open': 'hihat',
  'bass-drum': 'kick',
  bass: 'kick',
  tom1: 'tom-high',
  tom2: 'tom-mid',
  tom3: 'tom-low',
  'floor-tom': 'tom-low',
  'tom-floor': 'tom-low',
  cymbal: 'crash',
};

const FALLBACK_SIZE_LANDSCAPE = 14;
const FALLBACK_SIZE_PORTRAIT = 26;
const FALLBACK_Y = 50;

/**
 * Donne le placement d'une pièce. Une pièce inconnue reçoit un rendu de tambour générique,
 * rangé sur une ligne avec les autres inconnues, pour que tout kit reste jouable.
 * @param {string} pieceId
 * @param {number} fallbackIndex Rang de la pièce parmi les inconnues.
 * @param {number} fallbackCount Nombre total de pièces inconnues.
 * @returns {PieceLayout}
 */
export function getPieceLayout(pieceId, fallbackIndex = 0, fallbackCount = 1) {
  const known = PIECE_LAYOUTS[pieceId] ?? PIECE_LAYOUTS[ID_ALIASES[pieceId]];
  if (known) return known;

  const x = ((fallbackIndex + 1) / (fallbackCount + 1)) * 100;
  return {
    look: 'drum',
    landscape: { x, y: FALLBACK_Y, size: FALLBACK_SIZE_LANDSCAPE },
    portrait: { x, y: FALLBACK_Y, size: FALLBACK_SIZE_PORTRAIT },
  };
}

/**
 * Indique si un id de pièce a un placement dédié.
 * @param {string} pieceId
 * @returns {boolean}
 */
export function hasDedicatedLayout(pieceId) {
  return pieceId in PIECE_LAYOUTS || pieceId in ID_ALIASES;
}
