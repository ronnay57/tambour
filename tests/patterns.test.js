import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  describeStep,
  findPattern,
  PATTERNS,
  pickDrumPart,
  STEPS_PER_BAR,
} from '../src/audio/patterns.js';

test('chaque ambiance a des grilles de 16 pas valides', () => {
  for (const pattern of PATTERNS) {
    assert.equal(pattern.bass.length, STEPS_PER_BAR, pattern.id);
    assert.equal(pattern.shaker.length, STEPS_PER_BAR, pattern.id);
    for (const part of Object.values(pattern.drums)) {
      for (const [piece, grid] of Object.entries(part)) {
        assert.match(grid, /^[xo.-]{16}$/, `${pattern.id} ${piece}`);
      }
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

test('pickDrumPart choisit la partie jouable avec le kit courant', () => {
  const groove = findPattern('groove');
  assert.equal(pickDrumPart(groove, null), groove.drums.drumset);
  assert.equal(
    pickDrumPart(groove, new Set(['kick', 'snare', 'hihat-closed'])),
    groove.drums.drumset,
  );
  assert.equal(
    pickDrumPart(groove, new Set(['cajon-bass', 'cajon-slap', 'clap'])),
    groove.drums.percussion,
  );
  const world = new Set([
    'bongo-high',
    'bongo-low',
    'conga-open',
    'conga-muted',
    'tumba',
    'darbuka-doum',
    'darbuka-tek',
    'darbuka-ka',
    'cajon-bass',
    'cajon-slap',
    'frame-low',
    'frame-high',
    'clap',
  ]);
  for (const pattern of PATTERNS) {
    const part = pickDrumPart(pattern, world);
    assert.ok(
      Object.keys(part).every((id) => world.has(id)),
      pattern.id,
    );
  }
});

test('chaque ambiance joue toutes ses pièces avec chacun des kits', () => {
  const drumset = [
    'kick',
    'snare',
    'snare-rimshot',
    'snare-sidestick',
    'tom-high',
    'tom-mid',
    'tom-floor',
    'hihat-closed',
    'hihat-open',
    'hihat-pedal',
    'crash',
    'splash',
    'ride',
    'ride-bell',
    'cowbell',
  ];
  const electronic = [
    'kick',
    'kick-boom',
    'snare',
    'clap',
    'snare-rimshot',
    'tom-high',
    'tom-mid',
    'tom-floor',
    'hihat-closed',
    'hihat-open',
    'crash',
    'ride',
    'cowbell',
    'clave',
  ];
  for (const kit of [new Set(drumset), new Set(electronic)]) {
    for (const pattern of PATTERNS) {
      const part = pickDrumPart(pattern, kit);
      assert.ok(
        Object.keys(part).every((id) => kit.has(id)),
        pattern.id,
      );
    }
  }
  assert.equal(
    pickDrumPart(findPattern('afro'), new Set(drumset)),
    findPattern('afro').drums.drumset,
  );
});
