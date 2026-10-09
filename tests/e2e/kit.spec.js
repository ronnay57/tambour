import { expect, test } from '@playwright/test';

const PIECES = '#drum-kit [data-piece-id]';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(PIECES).first()).toBeVisible();
  // Garde la trace des sons joués, pour vérifier qu'une frappe atteint bien le moteur.
  await page.evaluate(() => {
    const { engine } = window.tambour;
    const play = engine.play.bind(engine);
    window.playedSounds = [];
    window.animatedPieces = new Set();
    // L'animation de frappe est trop brève pour être observée à coup sûr : on note qui s'anime.
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const piece = this.closest('[data-piece-id]');
      if (piece) window.animatedPieces.add(piece.dataset.pieceId);
      return animate.apply(this, args);
    };
    engine.play = (soundId, ...rest) => {
      window.playedSounds.push(soundId);
      return play(soundId, ...rest);
    };
  });
});

const playedSounds = (page) => page.evaluate(() => window.playedSounds);
const animatedPieces = (page) => page.evaluate(() => [...window.animatedPieces]);

test('affiche une zone de frappe par pièce du kit', async ({ page }) => {
  const count = await page.evaluate(() => window.tambour.kit.pieces.length);
  await expect(page.locator(PIECES)).toHaveCount(count);
});

test('une frappe sur une pièce débloque le son, la joue et l’anime', async ({ page }) => {
  const snare = page.locator('#drum-kit [data-piece-id="snare"]');
  await snare.click();
  await expect.poll(() => playedSounds(page)).toContain('snare');
  await expect.poll(() => animatedPieces(page)).toContain('snare');
  await expect(page.locator('#hint')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.tambour.engine.context.state)).toBe('running');
});

test('le clavier joue la pièce associée', async ({ page, isMobile }) => {
  test.skip(isMobile, 'pas de clavier physique sur mobile');
  await page.keyboard.press('KeyF');
  await expect.poll(() => playedSounds(page)).toContain('snare');
});
