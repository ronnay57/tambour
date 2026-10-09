/**
 * Sons de synthèse provisoires, calculés une fois au démarrage.
 *
 * Ils servent tant que les vrais échantillons ne sont pas dans public/sounds/.
 * On les calcule directement dans des AudioBuffer plutôt que de créer des oscillateurs à
 * chaque frappe : la lecture passe ainsi par le même chemin, rapide, que les échantillons.
 */

const TWO_PI = 2 * Math.PI;
const PEAK_LEVEL = 0.9;

/** Bruit blanc reproductible, pour que les sons soient identiques d'un chargement à l'autre. */
function createNoise(seed = 1) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return (state / 4294967296) * 2 - 1;
  };
}

/** Filtre passe-haut d'ordre 1, suffisant pour éclaircir un bruit. */
function createHighPass(cutoff, sampleRate) {
  const rc = 1 / (TWO_PI * cutoff);
  const alpha = rc / (rc + 1 / sampleRate);
  let previousInput = 0;
  let previousOutput = 0;
  return (input) => {
    previousOutput = alpha * (previousOutput + input - previousInput);
    previousInput = input;
    return previousOutput;
  };
}

/** Peau accordée : sinus dont la hauteur chute vite après l'attaque, plus un clic. */
function renderDrum(sampleRate, { duration, startFreq, endFreq, pitchDecay, decay, click }) {
  const length = Math.floor(duration * sampleRate);
  const data = new Float32Array(length);
  const noise = createNoise(7);
  let phase = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const freq = endFreq + (startFreq - endFreq) * Math.exp(-t / pitchDecay);
    phase += (TWO_PI * freq) / sampleRate;
    const body = Math.sin(phase) * Math.exp(-t / decay);
    const attack = noise() * click * Math.exp(-t / 0.003);
    data[i] = body + attack;
  }
  return data;
}

/** Métal : bruit éclairci, plus quelques partiels inharmoniques pour le côté cuivré. */
function renderMetal(sampleRate, { duration, decay, cutoff, partials }) {
  const length = Math.floor(duration * sampleRate);
  const data = new Float32Array(length);
  const noise = createNoise(3);
  const highPass = createHighPass(cutoff, sampleRate);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let ring = 0;
    for (const freq of partials) ring += Math.sign(Math.sin(TWO_PI * freq * t));
    const raw = noise() * 0.7 + (ring / partials.length) * 0.3;
    data[i] = highPass(raw) * Math.exp(-t / decay);
  }
  return data;
}

/** Caisse claire : une peau courte mélangée à un bruit de timbre. */
function renderSnare(sampleRate) {
  const body = renderDrum(sampleRate, {
    duration: 0.3,
    startFreq: 330,
    endFreq: 185,
    pitchDecay: 0.02,
    decay: 0.06,
    click: 0.3,
  });
  const noise = createNoise(11);
  const highPass = createHighPass(1500, sampleRate);
  for (let i = 0; i < body.length; i++) {
    const t = i / sampleRate;
    body[i] = body[i] * 0.6 + highPass(noise()) * Math.exp(-t / 0.08) * 0.9;
  }
  return body;
}

const RECIPES = {
  kick: (rate) =>
    renderDrum(rate, {
      duration: 0.6,
      startFreq: 150,
      endFreq: 48,
      pitchDecay: 0.04,
      decay: 0.18,
      click: 0.4,
    }),
  snare: renderSnare,
  tomHigh: (rate) =>
    renderDrum(rate, {
      duration: 0.5,
      startFreq: 260,
      endFreq: 180,
      pitchDecay: 0.05,
      decay: 0.16,
      click: 0.2,
    }),
  tomFloor: (rate) =>
    renderDrum(rate, {
      duration: 0.7,
      startFreq: 160,
      endFreq: 100,
      pitchDecay: 0.06,
      decay: 0.22,
      click: 0.2,
    }),
  hihatClosed: (rate) =>
    renderMetal(rate, {
      duration: 0.15,
      decay: 0.03,
      cutoff: 7000,
      partials: [3140, 4170, 5310, 6220],
    }),
  crash: (rate) =>
    renderMetal(rate, {
      duration: 2.2,
      decay: 0.6,
      cutoff: 4000,
      partials: [2310, 3170, 4430, 5810, 7020],
    }),
};

/** Ramène le pic au même niveau pour toutes les pièces, comme le veut la convention sur les sons. */
function normalize(data) {
  let peak = 0;
  for (const sample of data) peak = Math.max(peak, Math.abs(sample));
  if (peak === 0) return data;
  const gain = PEAK_LEVEL / peak;
  for (let i = 0; i < data.length; i++) data[i] *= gain;
  return data;
}

/**
 * Calcule le son de synthèse d'une pièce.
 * @param {BaseAudioContext} context Contexte audio qui jouera le son.
 * @param {string} recipe Nom de la recette (champ `synth` d'une pièce).
 * @returns {AudioBuffer}
 */
export function renderSynthSound(context, recipe) {
  const render = RECIPES[recipe];
  if (!render) throw new Error(`Recette de synthèse inconnue : ${recipe}`);
  const data = normalize(render(context.sampleRate));
  const buffer = context.createBuffer(1, data.length, context.sampleRate);
  buffer.copyToChannel(data, 0);
  return buffer;
}
