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

/**
 * Même disposition que l'acoustique : seuls les sons changent.
 * @type {Kit}
 */
export const SYNTH_KIT = {
  id: 'synth',
  name: 'Batterie synthétique',
  pieces: ACOUSTIC_KIT.pieces,
  chokes: ACOUSTIC_KIT.chokes,
};

/**
 * Boîtes à rythmes façon 808 et 909, avec la disposition de l'acoustique.
 * @type {Kit}
 */
export const ELECTRONIC_KIT = {
  id: 'electronic',
  name: 'Batterie électronique',
  pieces: ACOUSTIC_KIT.pieces,
  chokes: { 'hihat-closed': ['hihat-open'] },
};

/**
 * Les recettes de synthèse de secours sont celles de la batterie : elles ne servent que si
 * les fichiers manquent, le temps de garder le kit jouable.
 * @type {Kit}
 */
export const WORLD_KIT = {
  id: 'world',
  name: 'Percussions du monde',
  pieces: [
    { id: 'bongo-high', name: 'Bongo aigu', keys: ['KeyI'], synth: 'tomHigh' },
    { id: 'bongo-low', name: 'Bongo grave', keys: ['KeyU'], synth: 'tomHigh' },
    { id: 'conga-open', name: 'Conga ouverte', keys: ['KeyJ'], synth: 'tomHigh' },
    { id: 'conga-muted', name: 'Conga étouffée', keys: ['KeyK'], synth: 'snare' },
    { id: 'tumba', name: 'Tumba', keys: ['KeyL'], synth: 'tomFloor' },
    { id: 'darbuka-doum', name: 'Darbouka (doum)', keys: ['KeyF'], synth: 'tomFloor' },
    { id: 'darbuka-tek', name: 'Darbouka (tek)', keys: ['KeyD'], synth: 'hihatClosed' },
    { id: 'darbuka-ka', name: 'Darbouka (ka)', keys: ['KeyS'], synth: 'hihatClosed' },
    { id: 'cajon-bass', name: 'Cajón (grave)', keys: ['Space'], synth: 'kick' },
    { id: 'cajon-slap', name: 'Cajón (claqué)', keys: ['KeyB'], synth: 'snare' },
    { id: 'frame-low', name: 'Tambour sur cadre grave', keys: ['KeyG'], synth: 'tomFloor' },
    { id: 'frame-high', name: 'Tambour sur cadre aigu', keys: ['KeyH'], synth: 'tomHigh' },
    { id: 'clap', name: 'Frappe de mains', keys: ['KeyC'], synth: 'snare' },
  ],
  chokes: {},
};

/** Tous les kits disponibles, le premier est celui chargé au démarrage. */
export const KITS = [ACOUSTIC_KIT, ELECTRONIC_KIT, WORLD_KIT, SYNTH_KIT];
