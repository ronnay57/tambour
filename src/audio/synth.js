// Petits instruments synthétisés pour l'accompagnement et le métronome.
// Les synthétiser plutôt que charger des échantillons garde les boucles
// justes à n'importe quel tempo et dans n'importe quelle tonalité.

const A4_MIDI = 69;
const A4_FREQUENCY = 440;
const SILENCE = 0.0001;

const BASS_LEVEL = 0.35;
const BASS_RELEASE_SECONDS = 0.08;
const PAD_LEVEL = 0.06;
const PAD_ATTACK_SECONDS = 0.25;
const PAD_RELEASE_SECONDS = 0.4;
const PAD_DETUNE_CENTS = 7;
const SHAKER_LEVEL = 0.12;
const SHAKER_DECAY_SECONDS = 0.05;
const SHAKER_HIGHPASS_HZ = 6000;
const NOISE_SECONDS = 0.2;
const CLICK_LEVEL = 0.4;
const CLICK_DECAY_SECONDS = 0.04;
const CLICK_ACCENT_HZ = 1760;
const CLICK_HZ = 1320;

// Couleur du filtre selon l'ambiance de la boucle.
const TONE_CUTOFF_HZ = { warm: 900, soft: 600, bright: 2200 };
const BASS_WAVE = { warm: 'triangle', soft: 'sine', bright: 'sawtooth' };

const noiseBuffers = new WeakMap();

/**
 * Convertit un numéro de note MIDI en fréquence.
 * @param {number} midi
 * @returns {number} fréquence en hertz
 */
export function midiToFrequency(midi) {
  return A4_FREQUENCY * 2 ** ((midi - A4_MIDI) / 12);
}

function createEnvelope(context, destination, time, level, attack, hold, release) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(SILENCE, time);
  gain.gain.exponentialRampToValueAtTime(level, time + attack);
  gain.gain.setValueAtTime(level, time + attack + hold);
  gain.gain.exponentialRampToValueAtTime(SILENCE, time + attack + hold + release);
  gain.connect(destination);
  return { gain, end: time + attack + hold + release };
}

function createLowpass(context, destination, tone) {
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = TONE_CUTOFF_HZ[tone] ?? TONE_CUTOFF_HZ.warm;
  filter.connect(destination);
  return filter;
}

/**
 * Joue une note de basse.
 * @param {BaseAudioContext} context
 * @param {AudioNode} destination
 * @param {number} midi
 * @param {number} time  heure audio de début
 * @param {number} duration  durée tenue en secondes
 * @param {string} [tone]
 */
export function playBass(context, destination, midi, time, duration, tone = 'warm') {
  const filter = createLowpass(context, destination, tone);
  const { gain, end } = createEnvelope(context, filter, time, BASS_LEVEL, 0.005, duration, BASS_RELEASE_SECONDS);
  const osc = context.createOscillator();
  osc.type = BASS_WAVE[tone] ?? BASS_WAVE.warm;
  osc.frequency.setValueAtTime(midiToFrequency(midi), time);
  osc.connect(gain);
  osc.start(time);
  osc.stop(end);
}

/**
 * Joue un accord tenu (nappe), une octave au-dessus de la basse.
 * @param {BaseAudioContext} context
 * @param {AudioNode} destination
 * @param {{ root: number, notes: number[] }} chord
 * @param {number} time
 * @param {number} duration
 * @param {string} [tone]
 */
export function playPad(context, destination, chord, time, duration, tone = 'warm') {
  const filter = createLowpass(context, destination, tone);
  const { gain, end } = createEnvelope(
    context,
    filter,
    time,
    PAD_LEVEL,
    PAD_ATTACK_SECONDS,
    Math.max(0, duration - PAD_ATTACK_SECONDS),
    PAD_RELEASE_SECONDS,
  );
  // Deux oscillateurs légèrement désaccordés par note : un son plus large.
  for (const interval of chord.notes) {
    for (const detune of [-PAD_DETUNE_CENTS, PAD_DETUNE_CENTS]) {
      const osc = context.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(midiToFrequency(chord.root + 12 + interval), time);
      osc.detune.setValueAtTime(detune, time);
      osc.connect(gain);
      osc.start(time);
      osc.stop(end);
    }
  }
}

function getNoiseBuffer(context) {
  let buffer = noiseBuffers.get(context);
  if (!buffer) {
    const length = Math.floor(context.sampleRate * NOISE_SECONDS);
    buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(context, buffer);
  }
  return buffer;
}

/**
 * Joue un petit coup de shaker (bruit filtré).
 * @param {BaseAudioContext} context
 * @param {AudioNode} destination
 * @param {number} intensity  de 0 à 1
 * @param {number} time
 */
export function playShaker(context, destination, intensity, time) {
  if (intensity <= 0) return;
  const filter = context.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = SHAKER_HIGHPASS_HZ;
  filter.connect(destination);
  const { gain, end } = createEnvelope(context, filter, time, SHAKER_LEVEL * intensity, 0.002, 0, SHAKER_DECAY_SECONDS);
  const source = context.createBufferSource();
  source.buffer = getNoiseBuffer(context);
  source.connect(gain);
  source.start(time);
  source.stop(end);
}

/**
 * Joue un clic de métronome, plus aigu sur le premier temps.
 * @param {BaseAudioContext} context
 * @param {AudioNode} destination
 * @param {boolean} accent
 * @param {number} time
 */
export function playClick(context, destination, accent, time) {
  const { gain, end } = createEnvelope(context, destination, time, CLICK_LEVEL, 0.001, 0, CLICK_DECAY_SECONDS);
  const osc = context.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(accent ? CLICK_ACCENT_HZ : CLICK_HZ, time);
  osc.connect(gain);
  osc.start(time);
  osc.stop(end);
}
