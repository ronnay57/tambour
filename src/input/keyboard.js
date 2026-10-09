/**
 * Clavier : transforme les touches en frappes.
 */

/** Frappe normale au clavier ; Maj donne un accent. */
const KEY_VELOCITY = 0.7;
const ACCENT_VELOCITY = 1;

/**
 * @typedef {import('../audio/kits.js').Kit} Kit
 * @typedef {{ pieceId: string, velocity: number, x?: number, y?: number }} Hit
 */

/** Espace active un bouton qui a le focus : on le lui laisse, sauf sur une pièce du kit. */
function isFocusedControl(target) {
  return (
    target instanceof HTMLElement &&
    ['BUTTON', 'A', 'SUMMARY'].includes(target.tagName) &&
    !target.closest('[data-piece-id]')
  );
}

function isTypingTarget(target) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/**
 * Écoute le clavier et signale une frappe par pièce.
 * @param {Kit} kit Kit dont les touches sont écoutées.
 * @param {(hit: Hit) => void} onHit Appelé à chaque frappe.
 * @param {EventTarget} [target=window] Élément écouté.
 * @returns {() => void} Fonction qui arrête l'écoute.
 */
export function listenToKeyboard(kit, onHit, target = window) {
  const pieceByCode = new Map();
  for (const piece of kit.pieces) for (const code of piece.keys) pieceByCode.set(code, piece.id);

  function handleKeyDown(event) {
    // Une touche maintenue répète l'événement : un batteur ne frappe qu'une fois.
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (isTypingTarget(event.target)) return;
    const pieceId = pieceByCode.get(event.code);
    if (!pieceId) return;
    if (event.code === 'Space' && isFocusedControl(event.target)) return;
    // Empêche Espace de faire défiler la page.
    event.preventDefault();
    onHit({ pieceId, velocity: event.shiftKey ? ACCENT_VELOCITY : KEY_VELOCITY });
  }

  target.addEventListener('keydown', handleKeyDown);
  return () => target.removeEventListener('keydown', handleKeyDown);
}

/**
 * Libellé à afficher pour chaque pièce, selon la disposition réelle du clavier quand le
 * navigateur la connaît (AZERTY affiche « A » là où QWERTY affiche « Q »).
 * @param {Kit} kit
 * @returns {Promise<Map<string, string>>} Libellé par identifiant de pièce.
 */
export async function getKeyLabels(kit) {
  let layout = null;
  try {
    layout = await navigator.keyboard?.getLayoutMap();
  } catch {
    // API absente ou refusée (Firefox, Safari, iframe) : on retombe sur le nom de la touche.
  }
  const labels = new Map();
  for (const piece of kit.pieces) {
    const code = piece.keys[0];
    const label = code === 'Space' ? 'Espace' : (layout?.get(code) ?? code.replace(/^Key/, ''));
    labels.set(piece.id, label.toUpperCase());
  }
  return labels;
}
