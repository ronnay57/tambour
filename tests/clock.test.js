import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampBpm, createClock, MAX_BPM, MIN_BPM, stepDuration } from '../src/audio/clock.js';
import { createFakeContext, createFakeTimer } from './fakes.js';

test('clampBpm borne et arrondit le tempo', () => {
  assert.equal(clampBpm(10), MIN_BPM);
  assert.equal(clampBpm(999), MAX_BPM);
  assert.equal(clampBpm(100.4), 100);
  assert.equal(clampBpm(Number.NaN), 96);
});

test('les pas sont régulièrement espacés et planifiés en avance', () => {
  const context = createFakeContext();
  const timer = createFakeTimer();
  const steps = [];
  const clock = createClock({ context, timer, bpm: 120, onStep: (step, time) => steps.push({ step, time }) });
  const start = clock.start();
  for (let t = 0; t <= 2; t += 0.025) {
    context.currentTime = t;
    timer.runIntervals();
  }
  const duration = stepDuration(120);
  assert.equal(duration, 0.125);
  steps.forEach(({ step, time }, index) => {
    assert.equal(step, index);
    assert.ok(Math.abs(time - (start + index * duration)) < 1e-9);
  });
  // Jamais plus d'une fenêtre d'avance sur l'horloge audio.
  assert.ok(steps.at(-1).time < 2 + 0.13);
  assert.ok(steps.at(-1).time > 2);
});

test('un changement de tempo s’applique à partir du pas suivant', () => {
  const context = createFakeContext();
  const timer = createFakeTimer();
  const times = [];
  const clock = createClock({ context, timer, bpm: 60, onStep: (_, time) => times.push(time) });
  clock.start();
  const before = times.length;
  clock.setBpm(120);
  context.currentTime = 1;
  timer.runIntervals();
  // Le pas déjà daté garde son heure ; l'écart suivant suit le nouveau tempo.
  assert.ok(Math.abs(times[before] - times[before - 1] - stepDuration(60)) < 1e-9);
  const gap = times[before + 1] - times[before];
  assert.ok(Math.abs(gap - stepDuration(120)) < 1e-9);
});

test('stop arrête la planification', () => {
  const context = createFakeContext();
  const timer = createFakeTimer();
  const clock = createClock({ context, timer, onStep: () => {} });
  clock.start();
  assert.ok(clock.isRunning());
  clock.stop();
  assert.equal(timer.activeIntervals, 0);
  assert.ok(!clock.isRunning());
});
