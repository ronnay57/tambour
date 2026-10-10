// Préférences du joueur (tempo, ambiance, kit…) gardées dans le navigateur.
// Simple confort : la page fonctionne sans, y compris en navigation privée.

const STORAGE_KEY = 'tambour.music';

/**
 * Lit les préférences enregistrées.
 * @returns {object} objet vide si rien n'est disponible
 */
export function loadPreferences() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

/**
 * Enregistre les préférences, sans erreur si le stockage est indisponible.
 * @param {object} preferences
 */
export function savePreferences(preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Stockage bloqué ou plein : on ignore.
  }
}
