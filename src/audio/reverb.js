/**
 * Réverbération de pièce commune à tout le kit, pour l'unifier (voir docs/DESIGN.md).
 * La réponse impulsionnelle est calculée ici : pas de fichier, donc pas de licence à vérifier.
 */

const IMPULSE_SECONDS = 1.2;
/** Vitesse de la décroissance : plus la valeur est grande, plus la queue s'éteint vite. */
const IMPULSE_DECAY = 3;
/** Retard avant la réverbération, comme l'écho des premiers murs. */
const PRE_DELAY_SECONDS = 0.012;
const SMOOTHING_SECONDS = 0.02;

/** Bruit stéréo décroissant exponentiellement, différent sur chaque canal pour l'ampleur. */
function createImpulse(context) {
  const length = Math.floor(IMPULSE_SECONDS * context.sampleRate);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, IMPULSE_DECAY);
    }
  }
  return impulse;
}

/**
 * Crée un départ de réverbération en parallèle du son direct.
 * @param {BaseAudioContext} context
 * @param {AudioNode} destination Où envoyer le son réverbéré.
 * @param {number} mix Part de réverbération au départ (0 à 1).
 * @returns {{ input: AudioNode, setMix: (mix: number) => void }} `input` reçoit le son direct.
 */
export function createReverb(context, destination, mix) {
  const preDelay = context.createDelay();
  preDelay.delayTime.value = PRE_DELAY_SECONDS;
  const convolver = context.createConvolver();
  convolver.buffer = createImpulse(context);
  const wet = context.createGain();
  wet.gain.value = mix;
  preDelay.connect(convolver).connect(wet).connect(destination);

  return {
    input: preDelay,
    setMix: (value) => wet.gain.setTargetAtTime(value, context.currentTime, SMOOTHING_SECONDS),
  };
}
