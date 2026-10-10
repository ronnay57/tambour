// Boucles d'accompagnement décrites comme des données, comme les kits :
// ajouter une ambiance revient à ajouter une entrée ici.
//
// Une mesure compte 16 pas (doubles croches). Pour chaque mesure :
// - `chord` : fondamentale (numéro MIDI) et intervalles de la nappe ;
// - la ligne de basse `bass` (16 pas, répétée à chaque mesure) donne, pour
//   chaque pas, un décalage en demi-tons depuis la fondamentale, ou `null` ;
// - `shaker` (16 pas) donne l'intensité d'un petit bruit percussif, de 0 à 1 ;
// - `drums` propose une partie rythmique par famille de kit (`drumset` pour
//   les batteries, `percussion` pour les percussions du monde, `electronic`
//   quand la batterie électronique n'a pas les pièces de `drumset`). Chaque partie
//   associe à des pièces une grille de 16 caractères : `x` frappe forte,
//   `o` moyenne, `-` douce, `.` silence. On joue la partie dont le kit courant
//   possède le plus de pièces ; les pièces absentes sont ignorées.

export const STEPS_PER_BAR = 16;

const _ = null;

/**
 * @typedef {object} Chord
 * @property {number} root  note MIDI de la basse (octave grave)
 * @property {number[]} notes  intervalles de la nappe au-dessus de root + 12
 */

/**
 * @typedef {object} Pattern
 * @property {string} id
 * @property {string} label
 * @property {number} bpm  tempo conseillé
 * @property {Chord[]} chords  une entrée par mesure
 * @property {(number|null)[]} bass
 * @property {number[]} shaker
 * @property {Record<string, Record<string, string>>} drums  parties par famille de kit
 * @property {'warm'|'soft'|'bright'} tone  couleur du son de basse et de nappe
 */

const DRUM_VELOCITIES = { x: 0.95, o: 0.65, '-': 0.35 };

/** @type {Pattern[]} */
export const PATTERNS = [
  {
    id: 'groove',
    label: 'Groove',
    bpm: 100,
    tone: 'warm',
    chords: [
      { root: 40, notes: [0, 3, 7, 10] }, // Mi m7
      { root: 45, notes: [0, 4, 7, 10] }, // La 7
    ],
    bass: [0, _, _, 12, _, _, 10, _, 0, _, 7, _, _, 10, 12, _],
    shaker: [0, 0, 0.6, 0, 0, 0, 0.6, 0, 0, 0, 0.6, 0, 0, 0, 0.6, 0.3],
    drums: {
      drumset: {
        kick: 'x.....x...x.....',
        snare: '....x.......x...',
        'hihat-closed': 'o-o-o-o-o-o-o-o-',
      },
      percussion: {
        'cajon-bass': 'x.....x...x.....',
        'cajon-slap': '....x.......x...',
        'conga-muted': 'o-o-o-o-o-o-o-o-',
      },
    },
  },
  {
    id: 'afro',
    label: 'Afro',
    bpm: 108,
    tone: 'bright',
    chords: [
      { root: 45, notes: [0, 3, 7, 10] }, // La m7
      { root: 45, notes: [0, 3, 7, 10] },
      { root: 50, notes: [0, 4, 7, 10] }, // Ré 7
      { root: 50, notes: [0, 4, 7, 10] },
    ],
    bass: [0, _, _, 0, _, _, 7, _, _, 10, _, 12, _, 7, _, _],
    shaker: [0.7, 0.3, 0.5, 0.3, 0.7, 0.3, 0.5, 0.3, 0.7, 0.3, 0.5, 0.3, 0.7, 0.3, 0.5, 0.3],
    drums: {
      drumset: {
        kick: 'x.......x.x.....',
        'snare-sidestick': '...o..o....o..o.',
        cowbell: 'o.o.o.oo.o.o.o.o',
        'hihat-pedal': '....-.......-...',
      },
      percussion: {
        tumba: 'x.......x.x.....',
        'conga-open': '...o..o....o..o.',
        'bongo-high': 'o.o.o.oo.o.o.o.o',
        clap: '....-.......-...',
      },
      electronic: {
        kick: 'x.......x.x.....',
        clave: '...o..o....o..o.',
        cowbell: 'o.o.o.oo.o.o.o.o',
        'hihat-closed': '....-.......-...',
      },
    },
  },
  {
    id: 'lofi',
    label: 'Lo-fi',
    bpm: 78,
    tone: 'soft',
    chords: [
      { root: 38, notes: [0, 3, 7, 10, 14] }, // Ré m9
      { root: 43, notes: [0, 4, 10, 14] }, // Sol 9
      { root: 36, notes: [0, 4, 7, 11, 14] }, // Do maj9
      { root: 45, notes: [0, 3, 7, 10] }, // La m7
    ],
    bass: [0, _, _, _, _, _, _, 7, _, _, 0, _, _, _, _, _],
    shaker: [0, 0, 0.3, 0, 0, 0, 0.3, 0.2, 0, 0, 0.3, 0, 0, 0, 0.3, 0],
    drums: {
      drumset: {
        kick: 'o......o..o.....',
        'snare-sidestick': '....o.......o...',
        'hihat-closed': '-.-.-.--.-.-.-.-',
      },
      percussion: {
        'frame-low': 'o......o..o.....',
        'darbuka-tek': '....o.......o...',
        'darbuka-ka': '-.-.-.--.-.-.-.-',
      },
      electronic: {
        kick: 'o......o..o.....',
        clap: '....o.......o...',
        'hihat-closed': '-.-.-.--.-.-.-.-',
      },
    },
  },
  {
    id: 'electro',
    label: 'Électro',
    bpm: 124,
    tone: 'bright',
    chords: [
      { root: 45, notes: [0, 3, 7] }, // La m
      { root: 41, notes: [0, 4, 7] }, // Fa
      { root: 36, notes: [0, 4, 7] }, // Do
      { root: 43, notes: [0, 4, 7] }, // Sol
    ],
    bass: [_, _, 0, _, _, _, 0, _, _, _, 0, _, _, _, 0, 12],
    shaker: [0, 0, 0.8, 0, 0, 0, 0.8, 0, 0, 0, 0.8, 0, 0, 0, 0.8, 0],
    drums: {
      drumset: {
        kick: 'x...x...x...x...',
        snare: '....o.......o...',
        'hihat-open': '..o...o...o...o.',
      },
      percussion: {
        'darbuka-doum': 'x...x...x...x...',
        clap: '....o.......o...',
        'darbuka-tek': '..o...o...o...o.',
      },
    },
  },
];

/**
 * Retrouve une boucle par son identifiant.
 * @param {string} id
 * @returns {Pattern | undefined}
 */
export function findPattern(id) {
  return PATTERNS.find((pattern) => pattern.id === id);
}

/**
 * Choisit la partie rythmique adaptée aux pièces disponibles.
 * @param {Pattern} pattern
 * @param {Set<string>|null} available  pièces du kit courant ; `null` si inconnues
 * @returns {Record<string, string>}
 */
export function pickDrumPart(pattern, available) {
  const parts = Object.values(pattern.drums);
  if (!available) return parts[0];
  const score = (part) => Object.keys(part).filter((pieceId) => available.has(pieceId)).length;
  return parts.reduce((best, part) => (score(part) > score(best) ? part : best));
}

/**
 * Indique ce qui doit sonner à un pas donné de la boucle.
 * @param {Pattern} pattern
 * @param {number} step  numéro de pas depuis le début (non borné)
 * @param {Record<string, string>} [drumPart]  partie rythmique, la première par défaut
 * @returns {{ barStart: boolean, chord: Chord, bassNote: number | null, shaker: number, drums: { pieceId: string, velocity: number }[], beat: number | null }}
 *   `beat` vaut le numéro du temps dans la mesure (0 à 3) quand le pas tombe sur un temps.
 */
export function describeStep(pattern, step, drumPart = Object.values(pattern.drums)[0]) {
  const stepInBar = step % STEPS_PER_BAR;
  const bar = Math.floor(step / STEPS_PER_BAR) % pattern.chords.length;
  const chord = pattern.chords[bar];
  const offset = pattern.bass[stepInBar];
  return {
    barStart: stepInBar === 0,
    chord,
    bassNote: offset === null ? null : chord.root + offset,
    shaker: pattern.shaker[stepInBar],
    drums: Object.entries(drumPart)
      .filter(([, grid]) => grid[stepInBar] in DRUM_VELOCITIES)
      .map(([pieceId, grid]) => ({ pieceId, velocity: DRUM_VELOCITIES[grid[stepInBar]] })),
    beat: stepInBar % 4 === 0 ? stepInBar / 4 : null,
  };
}
