/**
 * Animations de frappe, jouées avec la Web Animations API : pas de classe à retirer ni de
 * reflow forcé, et plusieurs frappes rapprochées se superposent naturellement.
 */

const MAX_RIPPLES_PER_PIECE = 4;
const RIPPLE_DURATION_MS = 520;
const RIPPLE_MIN_SCALE = 1.1;
const RIPPLE_VELOCITY_SCALE = 1.4;

const SKIN_DURATION_MS = 190;
const SKIN_MAX_COMPRESSION = 0.07;

const CYMBAL_DURATION_MS = 680;
const CYMBAL_MAX_TILT_DEG = 7;
const HIHAT_DURATION_MS = 260;
const HIHAT_MAX_TILT_DEG = 3;

const GLOW_DURATION_MS = 360;
const GLOW_MIN_OPACITY = 0.25;
const FLOOR_DURATION_MS = 420;
const KEY_DURATION_MS = 200;
const REDUCED_FLASH_DURATION_MS = 160;

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

/**
 * Joue l'animation complète d'une frappe sur une pièce.
 * @param {HTMLElement} piece Élément `.piece`.
 * @param {number} velocity Force de 0 à 1.
 * @param {{ x: number, y: number } | undefined} point Point d'impact en coordonnées client.
 * @param {HTMLElement | null} floor Sol de la scène, qui réagit à la grosse caisse.
 * @returns {void}
 */
export function playHitAnimation(piece, velocity, point, floor) {
  const head = piece.querySelector('.piece__head');
  const glow = piece.querySelector('.piece__glow');
  const look = piece.dataset.look;

  if (reducedMotionQuery.matches) {
    // Animations réduites : un simple éclat lumineux, sans mouvement.
    glow?.animate([{ opacity: GLOW_MIN_OPACITY + velocity / 2 }, { opacity: 0 }], {
      duration: REDUCED_FLASH_DURATION_MS,
    });
    return;
  }

  if (look === 'cymbal' || look === 'hihat') {
    tiltCymbal(piece.querySelector('.piece__body'), velocity, point, look === 'hihat');
  } else {
    compressSkin(head, velocity);
  }

  glow?.animate(
    [{ opacity: GLOW_MIN_OPACITY + velocity * (1 - GLOW_MIN_OPACITY) }, { opacity: 0 }],
    {
      duration: GLOW_DURATION_MS,
      easing: EASE_OUT,
    },
  );

  if (head) spawnRipple(head, velocity, point);
  flashKey(piece.querySelector('.piece__key'));
  if (look === 'kick' && floor) pulseFloor(floor, velocity);
}

/** La peau s'enfonce puis rebondit, plus fort si la frappe est forte. */
function compressSkin(head, velocity) {
  if (!head) return;
  const scale = 1 - SKIN_MAX_COMPRESSION * velocity;
  head.animate(
    [
      { transform: 'scale(1)' },
      { transform: `scale(${scale})`, offset: 0.3 },
      { transform: `scale(${1 + (1 - scale) / 4})`, offset: 0.7 },
      { transform: 'scale(1)' },
    ],
    { duration: SKIN_DURATION_MS, easing: 'ease-out' },
  );
}

/** La cymbale bascule du côté frappé puis oscille en s'amortissant. */
function tiltCymbal(body, velocity, point, isHihat) {
  if (!body) return;
  const maxTilt = (isHihat ? HIHAT_MAX_TILT_DEG : CYMBAL_MAX_TILT_DEG) * velocity;
  const { dx, dy } = point ? relativeOffset(body, point) : { dx: 0, dy: -1 };
  // L'axe de bascule est perpendiculaire à la direction du point d'impact.
  const axis = `${-dy || 0.001}, ${dx}, 0`;
  const tilt = (ratio) => `perspective(600px) rotate3d(${axis}, ${maxTilt * ratio}deg)`;
  body.animate(
    [
      { transform: tilt(0) },
      { transform: tilt(1), offset: 0.12 },
      { transform: tilt(-0.55), offset: 0.35 },
      { transform: tilt(0.3), offset: 0.6 },
      { transform: tilt(-0.12), offset: 0.82 },
      { transform: tilt(0) },
    ],
    { duration: isHihat ? HIHAT_DURATION_MS : CYMBAL_DURATION_MS, easing: 'ease-out' },
  );
}

/** Une onde part du point d'impact et s'étale sur la peau ou le métal. */
function spawnRipple(head, velocity, point) {
  const layer = head.querySelector('.piece__ripples');
  if (!layer) return;
  while (layer.childElementCount >= MAX_RIPPLES_PER_PIECE) layer.firstElementChild?.remove();

  const { dx, dy } = point ? relativeOffset(head, point) : { dx: 0, dy: 0 };
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.left = `${50 + dx * 50}%`;
  ripple.style.top = `${50 + dy * 50}%`;
  layer.append(ripple);

  const endScale = RIPPLE_MIN_SCALE + RIPPLE_VELOCITY_SCALE * velocity;
  const animation = ripple.animate(
    [
      { transform: 'translate(-50%, -50%) scale(0)', opacity: 0.35 + velocity * 0.65 },
      { transform: `translate(-50%, -50%) scale(${endScale})`, opacity: 0 },
    ],
    { duration: RIPPLE_DURATION_MS, easing: EASE_OUT },
  );
  animation.onfinish = () => ripple.remove();
}

function flashKey(key) {
  if (!key) return;
  // Les keyframes ne résolvent pas toujours var() : on lit les couleurs du thème courant.
  const styles = getComputedStyle(key);
  key.animate(
    [
      {
        backgroundColor: styles.getPropertyValue('--color-accent'),
        color: styles.getPropertyValue('--color-accent-contrast'),
        transform: 'scale(1.15)',
      },
      { backgroundColor: styles.backgroundColor, color: styles.color, transform: 'scale(1)' },
    ],
    { duration: KEY_DURATION_MS, easing: 'ease-out' },
  );
}

/** Le sol de la scène « respire » à chaque coup de grosse caisse. */
function pulseFloor(floor, velocity) {
  floor.animate([{ opacity: 0.4 + velocity * 0.6 }, { opacity: 0 }], {
    duration: FLOOR_DURATION_MS,
    easing: EASE_OUT,
  });
}

/**
 * Position du point d'impact par rapport au centre de l'élément, entre -1 et 1 sur chaque axe.
 * @returns {{ dx: number, dy: number }}
 */
function relativeOffset(element, point) {
  const rect = element.getBoundingClientRect();
  const clampUnit = (value) => Math.max(-1, Math.min(1, value));
  return {
    dx: clampUnit((point.x - (rect.left + rect.width / 2)) / (rect.width / 2)),
    dy: clampUnit((point.y - (rect.top + rect.height / 2)) / (rect.height / 2)),
  };
}
