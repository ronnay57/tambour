/**
 * Chargement des fichiers d'un kit d'après son manifest.json (voir public/sounds/<kit>/README.md).
 */

/** Ordre d'essai des formats : .ogg d'abord, .mp3 pour Safari et les anciens navigateurs. */
const SAMPLE_FORMATS = ['ogg', 'mp3'];
/**
 * Volume relatif d'une frappe au bas d'une couche de vélocité. Les couches portent déjà
 * l'essentiel de la nuance ; on ne module que légèrement à l'intérieur de chacune.
 */
const LAYER_MIN_GAIN = 0.8;

/**
 * @typedef {object} SoundLayer
 * @property {number} max Vélocité la plus forte jouée par cette couche (0 à 1).
 * @property {AudioBuffer[]} buffers Variantes interchangeables.
 */

/**
 * @typedef {object} Sound
 * @property {number} gain Gain de mixage du son.
 * @property {number} minGain Volume relatif au bas de chaque couche (0 à 1).
 * @property {SoundLayer[]} layers Couches triées de la plus douce à la plus forte.
 */

async function fetchBuffer(context, url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return context.decodeAudioData(await response.arrayBuffer());
}

/** Essaie chaque format ; renvoie null si aucun n'est disponible ou lisible. */
async function loadFile(context, urlWithoutExtension) {
  for (const format of SAMPLE_FORMATS) {
    try {
      return await fetchBuffer(context, `${urlWithoutExtension}.${format}`);
    } catch {
      // Format absent ou non pris en charge : on passe au suivant.
    }
  }
  return null;
}

async function loadSound(context, kitUrl, piece) {
  const layers = await Promise.all(
    piece.velocities.map(async (layer) => {
      const buffers = await Promise.all(
        layer.files.map((file) => loadFile(context, kitUrl + file)),
      );
      return { max: layer.max, buffers: buffers.filter(Boolean) };
    }),
  );
  const playable = layers.filter((layer) => layer.buffers.length > 0).sort((a, b) => a.max - b.max);
  if (playable.length === 0) return null;
  // Si une couche manque, la plus forte restante couvre jusqu'à 1.
  playable[playable.length - 1].max = 1;
  return { gain: piece.gain ?? 1, minGain: LAYER_MIN_GAIN, layers: playable };
}

/**
 * Charge tous les sons décrits par le manifest d'un kit.
 * @param {BaseAudioContext} context
 * @param {string} kitUrl Adresse du dossier du kit, terminée par « / ».
 * @param {(id: string, sound: Sound) => void} onSoundLoaded Appelé dès qu'un son est prêt, pour
 *   pouvoir jouer les pièces chargées sans attendre les autres.
 * @returns {Promise<boolean>} Faux si le kit n'a pas de manifest lisible.
 */
export async function loadKitSamples(context, kitUrl, onSoundLoaded) {
  let manifest;
  try {
    const response = await fetch(`${kitUrl}manifest.json`);
    if (!response.ok) return false;
    manifest = await response.json();
  } catch {
    return false;
  }
  await Promise.all(
    manifest.pieces.map(async (piece) => {
      const sound = await loadSound(context, kitUrl, piece);
      if (sound) onSoundLoaded(piece.id, sound);
    }),
  );
  return true;
}
