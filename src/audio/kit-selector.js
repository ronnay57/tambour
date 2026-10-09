// Choix du kit : charge le kit demandé via le moteur et garde le kit courant.
// Les kits eux-mêmes restent des données décrites dans kits.js.

/**
 * Nom affichable d'un kit, quel que soit le champ utilisé dans kits.js.
 * @param {{ id: string, label?: string, name?: string }} kit
 * @returns {string}
 */
export function getKitLabel(kit) {
  return kit.label ?? kit.name ?? kit.id;
}

/**
 * Crée le sélecteur de kit.
 * @param {object} options
 * @param {{ id: string }[]} options.kits
 * @param {(kit: object) => Promise<unknown>} options.loadKit  chargement par le moteur
 * @returns {{ kits: object[], select(id: string): Promise<boolean>, getCurrentId(): string|null, onChange(listener: (id: string) => void): void }}
 */
export function createKitSelector({ kits, loadKit }) {
  let currentId = null;
  let latestRequest = 0;
  const listeners = new Set();

  return {
    kits,
    /**
     * Charge et active un kit. Si un autre choix arrive pendant le
     * chargement, c'est le dernier qui l'emporte.
     * @param {string} id
     * @returns {Promise<boolean>} vrai si ce kit est devenu le kit courant
     */
    async select(id) {
      const kit = kits.find((candidate) => candidate.id === id);
      if (!kit) return false;
      const request = ++latestRequest;
      await loadKit(kit);
      if (request !== latestRequest) return false;
      currentId = id;
      for (const listener of listeners) listener(id);
      return true;
    },
    getCurrentId() {
      return currentId;
    },
    onChange(listener) {
      listeners.add(listener);
    },
  };
}
