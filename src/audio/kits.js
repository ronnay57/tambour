/**
 * Description des kits : des données seulement, aucune logique.
 *
 * Les fichiers de chaque kit sont décrits par public/sounds/<kit>/manifest.json (couches de
 * vélocité, variantes, gain). Ici on choisit quelles pièces sont affichées et jouables, avec
 * quelles touches, et le son de synthèse qui les remplace tant que les fichiers manquent.
 */

/**
 * @typedef {object} Piece
 * @property {string} id Identifiant du son, le même que dans manifest.json.
 * @property {string} name Nom affiché.
 * @property {string[]} keys Touches clavier, en position physique (`KeyboardEvent.code`) pour que
 *   le kit tombe sous les mêmes doigts en AZERTY comme en QWERTY. La première est affichée.
 * @property {string} synth Recette de synthèse utilisée si les fichiers du kit sont absents.
 */

/**
 * @typedef {object} Kit
 * @property {string} id Nom du dossier dans public/sounds/.
 * @property {string} name Nom affiché.
 * @property {Piece[]} pieces Pièces affichées sur le kit.
 * @property {Record<string, string[]>} chokes Sons coupés par un autre son : sur une vraie
 *   batterie, refermer le charleston étouffe le charleston ouvert.
 */

/** @type {Kit} */
export const ACOUSTIC_KIT = {
  id: 'acoustic',
  name: 'Batterie acoustique',
  pieces: [
    { id: 'crash', name: 'Cymbale', keys: ['KeyI', 'KeyU'], synth: 'crash' },
    { id: 'hihat-closed', name: 'Charleston', keys: ['KeyJ', 'KeyH'], synth: 'hihatClosed' },
    { id: 'tom-high', name: 'Tom aigu', keys: ['KeyK'], synth: 'tomHigh' },
    { id: 'snare', name: 'Caisse claire', keys: ['KeyF', 'KeyD'], synth: 'snare' },
    { id: 'tom-floor', name: 'Tom basse', keys: ['KeyL'], synth: 'tomFloor' },
    { id: 'kick', name: 'Grosse caisse', keys: ['Space', 'KeyB'], synth: 'kick' },
  ],
  chokes: {
    'hihat-closed': ['hihat-open'],
    'hihat-pedal': ['hihat-open'],
  },
};

/** Tous les kits disponibles, le premier est celui chargé au démarrage. */
export const KITS = [ACOUSTIC_KIT];
