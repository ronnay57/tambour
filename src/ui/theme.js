/**
 * Bascule entre le thème clair « atelier » et le thème sombre « scène ».
 * Sans choix enregistré, on suit la préférence du système.
 */

const STORAGE_KEY = 'tambour:theme';
const THEMES = /** @type {const} */ (['light', 'dark']);

const SUN_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/>
  <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>`;
const MOON_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>`;

const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

/**
 * Applique le thème enregistré et branche le bouton de bascule.
 * @param {HTMLButtonElement} button
 * @returns {void}
 */
export function initTheme(button) {
  const saved = readSavedTheme();
  if (saved) document.documentElement.dataset.theme = saved;
  updateButton(button);

  button.addEventListener('click', (event) => {
    const next = getActiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    saveTheme(next);
    updateButton(button);
    // Après un clic à la souris ou au doigt, rendre le focus : sinon Espace rebasculerait le
    // thème au lieu de jouer la grosse caisse. Au clavier (detail = 0), le focus reste.
    if (event.detail > 0) button.blur();
  });
  systemDarkQuery.addEventListener('change', () => updateButton(button));
}

/**
 * Thème actuellement affiché.
 * @returns {'light' | 'dark'}
 */
export function getActiveTheme() {
  const chosen = document.documentElement.dataset.theme;
  if (THEMES.includes(chosen)) return chosen;
  return systemDarkQuery.matches ? 'dark' : 'light';
}

function updateButton(button) {
  const isDark = getActiveTheme() === 'dark';
  // L'icône montre le thème vers lequel on bascule.
  button.innerHTML = isDark ? SUN_ICON : MOON_ICON;
  button.setAttribute('aria-label', isDark ? 'Passer au thème clair' : 'Passer au thème sombre');
  button.title = button.getAttribute('aria-label');
}

// Le stockage peut être indisponible (navigation privée) : le thème reste alors celui de la session.
function readSavedTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(value) ? value : null;
  } catch {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Rien à faire : le choix vaut pour la session en cours.
  }
}
