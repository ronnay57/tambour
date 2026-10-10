import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createKitSelector, getKitLabel } from '../src/audio/kit-selector.js';

const KITS = [{ id: 'acoustic', name: 'Batterie acoustique' }, { id: 'electro' }];

test('getKitLabel accepte label, name ou id', () => {
  assert.equal(getKitLabel(KITS[0]), 'Batterie acoustique');
  assert.equal(getKitLabel(KITS[1]), 'electro');
});

test('le dernier choix gagne même si un chargement précédent finit après', async () => {
  const resolvers = {};
  const selector = createKitSelector({
    kits: KITS,
    loadKit: (kit) => new Promise((resolve) => (resolvers[kit.id] = resolve)),
  });
  const first = selector.select('acoustic');
  const second = selector.select('electro');
  resolvers.electro();
  resolvers.acoustic();
  assert.equal(await second, true);
  assert.equal(await first, false);
  assert.equal(selector.getCurrentId(), 'electro');
});

test('un kit inconnu est refusé', async () => {
  const selector = createKitSelector({ kits: KITS, loadKit: async () => {} });
  assert.equal(await selector.select('nope'), false);
  assert.equal(selector.getCurrentId(), null);
});
