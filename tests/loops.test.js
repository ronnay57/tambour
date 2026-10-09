import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLoopPlayer } from '../src/audio/loops.js';
import { createFakeContext, createFakeTimer } from './fakes.js';

function run(player, context, timer, until) {
  for (let t = context.currentTime; t <= until; t += 0.025) {
    context.currentTime = t;
    timer.runIntervals();
  }
}

test('la boucle joue basse, nappe et batterie du kit', () => {
  const context = createFakeContext();
  const timer = createFakeTimer();
  const pieces = [];
  const player = createLoopPlayer({
    context,
    timer,
    output: context.destination,
    bpm: 120,
    patternId: 'groove',
    playPiece: (pieceId, velocity, when) => pieces.push({ pieceId, velocity, when }),
  });
  const start = player.start();
  run(player, context, timer, 2);
  assert.ok(context.started.some((event) => event.kind === 'osc' && event.time === start));
  assert.ok(pieces.some((hit) => hit.pieceId === 'kick' && hit.when === start));
  assert.ok(pieces.some((hit) => hit.pieceId === 'snare'));
});

test('le métronome seul ne joue que des clics, un par temps', () => {
  const context = createFakeContext();
  const timer = createFakeTimer();
  const pieces = [];
  const player = createLoopPlayer({ context, timer, output: context.destination, bpm: 120, playPiece: (id) => pieces.push(id) });
  player.setMetronome(true);
  const start = player.start();
  run(player, context, timer, 1.9);
  const clicks = context.started.filter((event) => event.type === 'square');
  assert.deepEqual(
    clicks.map((click) => click.time - start),
    [0, 0.5, 1, 1.5],
  );
  assert.equal(pieces.length, 0);
});

test('sans batterie ou à volume nul, aucune pièce du kit ne sonne', () => {
  const context = createFakeContext();
  const timer = createFakeTimer();
  const pieces = [];
  const player = createLoopPlayer({ context, timer, output: context.destination, patternId: 'afro', playPiece: (id) => pieces.push(id) });
  player.setLoopVolume(0);
  player.start();
  run(player, context, timer, 1);
  player.stop();
  player.setLoopVolume(1);
  player.setDrums(false);
  player.start();
  run(player, context, timer, 2);
  assert.equal(pieces.length, 0);
});

test('getCurrentBeat suit les temps joués', () => {
  const context = createFakeContext();
  const timer = createFakeTimer();
  const player = createLoopPlayer({ context, timer, output: context.destination, bpm: 120 });
  player.setMetronome(true);
  const start = player.start();
  assert.equal(player.getCurrentBeat(), null);
  run(player, context, timer, start + 0.6);
  assert.equal(player.getCurrentBeat(), 1);
  player.stop();
  assert.equal(player.getCurrentBeat(), null);
});
