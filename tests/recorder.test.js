import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRecorder } from '../src/audio/recorder.js';
import { createFakeContext, createFakeTimer } from './fakes.js';

function setup() {
  const context = createFakeContext();
  const timer = createFakeTimer();
  const played = [];
  const recorder = createRecorder({ context, timer, play: (pieceId, velocity, when) => played.push({ pieceId, velocity, when }) });
  return { context, timer, played, recorder };
}

test("n'enregistre rien hors enregistrement", () => {
  const { recorder } = setup();
  recorder.capture({ pieceId: 'kick', velocity: 1 });
  assert.equal(recorder.stopRecording(), null);
});

test('enregistre les frappes avec leur heure relative', () => {
  const { context, recorder } = setup();
  context.currentTime = 10;
  recorder.startRecording();
  context.currentTime = 10.5;
  recorder.capture({ pieceId: 'kick', velocity: 0.9 });
  context.currentTime = 11;
  recorder.capture({ pieceId: 'snare', velocity: 0.5 });
  context.currentTime = 12;
  const recording = recorder.stopRecording();
  assert.equal(recording.duration, 2);
  assert.deepEqual(recording.hits, [
    { time: 0.5, pieceId: 'kick', velocity: 0.9 },
    { time: 1, pieceId: 'snare', velocity: 0.5 },
  ]);
});

test('la réécoute rejoue chaque frappe à son heure, au fil de la planification', () => {
  const { context, timer, played, recorder } = setup();
  const recording = {
    duration: 2,
    meta: {},
    hits: [
      { time: 0, pieceId: 'kick', velocity: 1 },
      { time: 1, pieceId: 'snare', velocity: 0.6 },
    ],
  };
  let ended = false;
  const origin = recorder.startPlayback(recording, { startAt: 5, onEnd: () => (ended = true) });
  assert.equal(origin, 5);
  assert.equal(played.length, 0);
  context.currentTime = 4.95;
  timer.runIntervals();
  assert.deepEqual(played, [{ pieceId: 'kick', velocity: 1, when: 5 }]);
  context.currentTime = 5.95;
  timer.runIntervals();
  assert.equal(played[1].when, 6);
  assert.ok(recorder.isPlayingBack());
  timer.runTimeouts();
  assert.ok(ended);
  assert.ok(!recorder.isPlayingBack());
});

test('stopPlayback interrompt la réécoute', () => {
  const { context, timer, played, recorder } = setup();
  recorder.startPlayback({ duration: 3, meta: {}, hits: [{ time: 2, pieceId: 'kick', velocity: 1 }] });
  recorder.stopPlayback();
  context.currentTime = 3;
  timer.runIntervals();
  assert.equal(played.length, 0);
});
