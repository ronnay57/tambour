import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.pad').first()).toBeVisible();
});

test('affiche une zone de frappe par pièce du kit', async ({ page }) => {
  const count = await page.evaluate(() => window.tambour.kit.pieces.length);
  await expect(page.locator('.pad')).toHaveCount(count);
});

test('une frappe sur une pièce débloque le son et l’anime', async ({ page }) => {
  const snare = page.locator('[data-piece-id="snare"]');
  await snare.click();
  await expect(snare).toHaveClass(/pad--hit/);
  await expect(page.locator('#hint')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.tambour.engine.context.state)).toBe('running');
});

test('le clavier joue la pièce associée', async ({ page, isMobile }) => {
  test.skip(isMobile, 'pas de clavier physique sur mobile');
  await page.keyboard.press('KeyF');
  await expect(page.locator('[data-piece-id="snare"]')).toHaveClass(/pad--hit/);
});
