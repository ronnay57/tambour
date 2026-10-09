/**
 * Kit d'aperçu pour développer l'interface avant la fusion du prototype.
 * À remplacer par le kit de `audio/kits.js` dès qu'il existe : seuls `id`, `name` et `key`
 * de chaque pièce sont utilisés par l'interface.
 */

/** @type {import('./drum-kit.js').Kit} */
export const PREVIEW_KIT = {
  id: 'acoustic',
  name: 'Batterie acoustique',
  pieces: [
    { id: 'hihat', name: 'Charleston', key: 'a' },
    { id: 'crash', name: 'Crash', key: 'z' },
    { id: 'snare', name: 'Caisse claire', key: 's' },
    { id: 'tom-high', name: 'Tom aigu', key: 'e' },
    { id: 'tom-mid', name: 'Tom médium', key: 'r' },
    { id: 'kick', name: 'Grosse caisse', key: ' ' },
    { id: 'tom-low', name: 'Tom basse', key: 'f' },
    { id: 'ride', name: 'Ride', key: 'u' },
  ],
};
