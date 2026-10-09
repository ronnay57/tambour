/**
 * Affichage du kit et retour visuel des frappes.
 * Version minimale du prototype : le style et les animations définitives viennent à l'étape 3.
 */

/** Durée de l'onde de frappe, synchronisée avec l'animation `ripple` de main.css. */
const RIPPLE_DURATION_MS = 450;

/**
 * @typedef {import('../audio/kits.js').Kit} Kit
 */

/**
 * Dessine une zone de frappe par pièce.
 * @param {HTMLElement} container Élément qui reçoit les pièces (son contenu est remplacé).
 * @param {Kit} kit
 * @param {Map<string, string>} keyLabels Touche affichée par pièce.
 */
export function renderDrumKit(container, kit, keyLabels) {
  container.replaceChildren(
    ...kit.pieces.map((piece) => {
      const pad = document.createElement('button');
      pad.type = 'button';
      pad.className = 'pad';
      pad.dataset.pieceId = piece.id;
      // Le clavier joue déjà les pièces : le bouton ne doit pas voler le focus ni Espace.
      pad.tabIndex = -1;
      const label = keyLabels.get(piece.id) ?? '';
      pad.setAttribute('aria-label', `${piece.name} (touche ${label})`);

      const name = document.createElement('span');
      name.className = 'pad__name';
      name.textContent = piece.name;
      const key = document.createElement('kbd');
      key.className = 'pad__key';
      key.textContent = label;
      pad.append(name, key);
      return pad;
    }),
  );
}

/**
 * Anime la frappe d'une pièce : enfoncement et onde partant du point d'impact.
 * @param {HTMLElement} container Conteneur passé à `renderDrumKit`.
 * @param {string} pieceId
 * @param {number} velocity Force de 0 à 1, qui règle l'intensité de l'animation.
 * @param {{x?: number, y?: number}} [point] Point d'impact dans la pièce (0 à 1) ; centre par défaut.
 */
export function animateHit(container, pieceId, velocity, { x = 0.5, y = 0.5 } = {}) {
  const pad = container.querySelector(`[data-piece-id="${pieceId}"]`);
  if (!pad) return;

  // Relance l'animation même si la précédente n'est pas finie.
  pad.classList.remove('pad--hit');
  void pad.offsetWidth;
  pad.style.setProperty('--hit-strength', String(velocity));
  pad.classList.add('pad--hit');

  const ripple = document.createElement('span');
  ripple.className = 'pad__ripple';
  ripple.style.left = `${x * 100}%`;
  ripple.style.top = `${y * 100}%`;
  pad.append(ripple);
  setTimeout(() => ripple.remove(), RIPPLE_DURATION_MS);
}
