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
 * @property {number} [lugs] Nombre de tirants, si différent de celui du type de pièce.
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
    lugs: 8,
    landscape: { x: 67, y: 66, size: 17 },
    portrait: { x: 78, y: 62, size: 32 },
  },
};

/**
 * Disposition resserrée pour les kits sans tom médium ni ride (kit de 6 pièces du prototype) :
 * sans elle, la droite de la scène resterait vide.
 * @type {Record<string, Pick<PieceLayout, 'landscape' | 'portrait'>>}
 */
const COMPACT_PLACEMENTS = {
  hihat: { landscape: { x: 17, y: 55, size: 17 }, portrait: { x: 20, y: 45, size: 34 } },
  crash: { landscape: { x: 34, y: 24, size: 19 }, portrait: { x: 28, y: 14, size: 44 } },
  'tom-high': { landscape: { x: 56, y: 28, size: 16 }, portrait: { x: 72, y: 22, size: 36 } },
  'tom-low': { landscape: { x: 81, y: 52, size: 20 }, portrait: { x: 76, y: 52, size: 40 } },
  snare: { landscape: { x: 37, y: 70, size: 18 }, portrait: { x: 40, y: 66, size: 38 } },
  kick: { landscape: { x: 59, y: 74, size: 22 }, portrait: { x: 58, y: 87, size: 42 } },
};

/** Pièces dont la présence demande la disposition complète. */
const FULL_KIT_PIECES = ['tom-mid', 'ride'];

/** Alias courants, pour suivre les ids choisis par `audio/kits.js` sans dupliquer les placements. */
/** @type {Record<string, string>} */
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
 * Ramène un id de pièce à celui de son placement (`tom-floor` devient `tom-low`).
 * @param {string} pieceId
 * @returns {string}
 */
export function resolvePieceId(pieceId) {
  return ID_ALIASES[pieceId] ?? pieceId;
}

/**
 * Indique si un kit tient dans la disposition resserrée.
 * @param {string[]} pieceIds
 * @returns {boolean}
 */
export function isCompactKit(pieceIds) {
  return !pieceIds.some((id) => FULL_KIT_PIECES.includes(resolvePieceId(id)));
}

/**
 * Donne le placement d'une pièce. Une pièce inconnue reçoit un rendu de tambour générique,
 * rangé sur une ligne avec les autres inconnues, pour que tout kit reste jouable.
 * @param {string} pieceId
 * @param {number} fallbackIndex Rang de la pièce parmi les inconnues.
 * @param {number} fallbackCount Nombre total de pièces inconnues.
 * @param {boolean} [compact] Utiliser la disposition resserrée (voir `isCompactKit`).
 * @returns {PieceLayout}
 */
export function getPieceLayout(pieceId, fallbackIndex = 0, fallbackCount = 1, compact = false) {
  const id = resolvePieceId(pieceId);
  const known = PIECE_LAYOUTS[id];
  if (known)
    return compact && COMPACT_PLACEMENTS[id] ? { ...known, ...COMPACT_PLACEMENTS[id] } : known;

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
  return resolvePieceId(pieceId) in PIECE_LAYOUTS;
}
