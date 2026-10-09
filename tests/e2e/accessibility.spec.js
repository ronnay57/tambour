import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('aucun problème d’accessibilité grave (WCAG 2.2 A et AA)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.pad').first()).toBeVisible();

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const serious = violations.filter((v) => ['serious', 'critical'].includes(v.impact));

  // Le détail s'affiche en cas d'échec : règle, gravité et éléments fautifs.
  expect(
    serious.map((v) => ({ rule: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
});
