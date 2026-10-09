import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeStep, findPattern, PATTERNS, STEPS_PER_BAR } from '../src/audio/patterns.js';

test('chaque ambiance a des grilles de 16 pas valides', () => {
  for (const pattern of PATTERNS) {
    assert.equal(pattern.bass.length, STEPS_PER_BAR, pattern.id);
    assert.equal(pattern.shaker.length, STEPS_PER_BAR, pattern.id);
    for (const [piece, grid] of Object.entries(pattern.drums)) {
      assert.match(grid, /^[xo.-]{16}$/, `${pattern.id} ${piece}`);
    }
    assert.ok(pattern.chords.length > 0);
  }
});

test('describeStep enchaîne les mesures et les accords', () => {
  const groove = findPattern('groove');
  assert.equal(describeStep(groove, 0).bassNote, groove.chords[0].root);
  assert.ok(describeStep(groove, 0).barStart);
  assert.equal(describeStep(groove, STEPS_PER_BAR).chord, groove.chords[1]);
  assert.equal(describeStep(groove, 2 * STEPS_PER_BAR).chord, groove.chords[0]);
  assert.equal(describeStep(groove, 1).bassNote, null);
  assert.equal(describeStep(groove, 4).beat, 1);
  assert.equal(describeStep(groove, 5).beat, null);
});

test('describeStep traduit la grille de batterie en vélocités', () => {
  const groove = findPattern('groove');
  const hits = describeStep(groove, 0).drums;
  assert.deepEqual(
    hits.map((hit) => hit.pieceId),
    ['kick', 'hihat-closed'],
  );
  assert.ok(hits[0].velocity > hits[1].velocity);
});
