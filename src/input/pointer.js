/**
 * Souris et toucher : transforme les appuis sur les pièces en frappes, plusieurs doigts à la fois.
 */

/** Force au bord de la pièce ; au centre elle vaut 1, comme une peau qui sonne plus plein au milieu. */
const EDGE_VELOCITY = 0.35;

/**
 * @typedef {import('./keyboard.js').Hit} Hit
 */

/**
 * Écoute les appuis sur les éléments portant `data-piece-id` à l'intérieur d'un conteneur.
 * @param {HTMLElement} container Élément qui contient les pièces.
 * @param {(hit: Hit) => void} onHit Appelé à chaque frappe ; `x` et `y` donnent le point
 *   d'impact dans la pièce, de 0 à 1.
 * @returns {() => void} Fonction qui arrête l'écoute.
 */
export function listenToPointer(container, onHit) {
  function handlePointerDown(event) {
    // Seul le bouton principal frappe ; chaque doigt produit son propre pointerdown.
    if (event.button !== 0) return;
    const pad = event.target instanceof Element ? event.target.closest('[data-piece-id]') : null;
    if (!pad || !container.contains(pad)) return;
    // pointerdown plutôt que click : le son part à l'appui, pas au relâchement.
    // preventDefault évite sélection de texte, zoom et clic simulé sur mobile.
    event.preventDefault();

    const rect = pad.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const distanceFromCenter = Math.min(1, Math.hypot(x - 0.5, y - 0.5) * 2);
    const velocity = 1 - (1 - EDGE_VELOCITY) * distanceFromCenter;
    onHit({ pieceId: pad.dataset.pieceId, velocity, x, y });
  }

  // Un appui long ouvrirait le menu contextuel sur mobile au milieu d'un roulement.
  function handleContextMenu(event) {
    event.preventDefault();
  }

  container.addEventListener('pointerdown', handlePointerDown);
  container.addEventListener('contextmenu', handleContextMenu);
  return () => {
    container.removeEventListener('pointerdown', handlePointerDown);
    container.removeEventListener('contextmenu', handleContextMenu);
  };
}
