// Assemble boucles, tempo, choix du kit et enregistrement autour du moteur
// audio, et les relie aux commandes. main.js n'a qu'à appeler setupMusic().

import { clampBpm, DEFAULT_BPM, MAX_BPM, MIN_BPM, stepDuration } from './audio/clock.js';
import { getKitLabel, createKitSelector } from './audio/kit-selector.js';
import { createLoopPlayer, DEFAULT_LOOP_VOLUME } from './audio/loops.js';
import { findPattern, PATTERNS, STEPS_PER_BAR } from './audio/patterns.js';
import { createRecorder } from './audio/recorder.js';
import { renderControls } from './ui/controls.js';
import { loadPreferences, savePreferences } from './ui/preferences.js';

/**
 * Met en place l'accompagnement, le choix du kit et l'enregistrement.
 * @param {object} options
 * @param {object} options.engine  moteur audio : `context`, `output`, `play(pieceId, velocity, when)`, `loadKit(kit)`
 * @param {{ id: string }[]} options.kits  kits décrits dans kits.js
 * @param {HTMLElement} options.root  conteneur des commandes
 * @returns {{ captureHit(hit: { pieceId: string, velocity: number }): void, selectKit(id: string): Promise<boolean> }}
 */
export function setupMusic({ engine, kits, root }) {
  const preferences = loadPreferences();
  const state = {
    kitId: null,
    kitLoading: false,
    patternId: findPattern(preferences.patternId)?.id ?? null,
    playing: false,
    bpm: clampBpm(preferences.bpm ?? DEFAULT_BPM),
    metronome: false,
    drums: preferences.drums ?? true,
    recording: false,
    hasRecording: false,
    playingBack: false,
  };
  let lastRecording = null;
  let recordingMeta = null;
  let loops = null;
  let recorder = null;
  let beatFrame = null;

  const play = (pieceId, velocity, when) => engine.play(pieceId, velocity, when);
  const kitSelector = createKitSelector({ kits, loadKit: (kit) => engine.loadKit(kit) });

  // Le contexte audio n'existe qu'après une première action de l'utilisateur :
  // on crée boucles et enregistreur au premier besoin.
  function ensureAudio() {
    if (loops) return;
    const context = engine.context;
    context.resume?.();
    loops = createLoopPlayer({
      context,
      output: engine.output ?? context.destination,
      bpm: state.bpm,
      patternId: state.patternId,
      playPiece: play,
    });
    loops.setLoopVolume(preferences.loopVolume ?? DEFAULT_LOOP_VOLUME);
    loops.setDrums(state.drums);
    recorder = createRecorder({ context, play });
  }

  function refresh() {
    controls.update(state);
    savePreferences({
      patternId: state.patternId,
      bpm: state.bpm,
      drums: state.drums,
      kitId: state.kitId,
      loopVolume: preferences.loopVolume,
    });
  }

  function animateBeat() {
    controls.showBeat(loops?.getCurrentBeat() ?? null);
    beatFrame = state.playing ? requestAnimationFrame(animateBeat) : null;
    if (!state.playing) controls.showBeat(null);
  }

  function startLoop() {
    ensureAudio();
    const startTime = loops.start();
    state.playing = true;
    if (beatFrame === null) beatFrame = requestAnimationFrame(animateBeat);
    return startTime;
  }

  function stopLoop() {
    loops?.stop();
    state.playing = false;
  }

  function barDuration() {
    return stepDuration(state.bpm) * STEPS_PER_BAR;
  }

  function startRecording() {
    ensureAudio();
    recorder.stopPlayback();
    const start = recorder.startRecording();
    const loopStart = loops.getStartTime();
    // On note où l'on se trouve dans la mesure pour rejouer calé sur la boucle.
    const loopOffset = loopStart === null ? null : (start - loopStart) % barDuration();
    recordingMeta = {
      kitId: state.kitId,
      patternId: state.playing ? state.patternId : null,
      metronome: state.playing && state.metronome,
      bpm: state.bpm,
      drums: state.drums,
      loopOffset,
    };
    state.recording = true;
  }

  function stopRecording() {
    const recording = recorder.stopRecording();
    recording.meta = recordingMeta;
    lastRecording = recording;
    state.recording = false;
    state.hasRecording = recording.hits.length > 0;
  }

  function startPlayback() {
    ensureAudio();
    const { meta } = lastRecording;
    let startAt;
    const withLoop = meta.loopOffset !== null && (meta.patternId || meta.metronome);
    if (withLoop) {
      stopLoop();
      Object.assign(state, {
        patternId: meta.patternId,
        bpm: meta.bpm,
        drums: meta.drums,
        metronome: meta.metronome,
      });
      loops.setPattern(meta.patternId);
      loops.setBpm(meta.bpm);
      loops.setDrums(meta.drums);
      loops.setMetronome(meta.metronome);
      startAt = startLoop() + meta.loopOffset;
    }
    recorder.startPlayback(lastRecording, {
      startAt,
      onEnd: () => {
        state.playingBack = false;
        if (withLoop) stopLoop();
        refresh();
      },
    });
    state.playingBack = true;
  }

  function stopPlayback() {
    recorder.stopPlayback();
    state.playingBack = false;
  }

  async function selectKit(id) {
    state.kitLoading = true;
    refresh();
    try {
      const selected = await kitSelector.select(id);
      if (selected) state.kitId = id;
      return selected;
    } finally {
      state.kitLoading = false;
      refresh();
    }
  }

  const actions = {
    selectKit,
    selectPattern(id) {
      state.patternId = id;
      loops?.setPattern(id);
      // À l'arrêt, on adopte le tempo conseillé de l'ambiance choisie.
      const pattern = findPattern(id);
      if (pattern && !state.playing) actions.setBpm(pattern.bpm);
      if (!id && !state.metronome) stopLoop();
      refresh();
    },
    togglePlay() {
      if (state.playing) stopLoop();
      else startLoop();
      refresh();
    },
    setBpm(bpm) {
      state.bpm = clampBpm(bpm);
      loops?.setBpm(state.bpm);
      refresh();
    },
    setMetronome(on) {
      ensureAudio();
      state.metronome = on;
      loops.setMetronome(on);
      if (!on && !state.patternId) stopLoop();
      refresh();
    },
    setDrums(on) {
      state.drums = on;
      loops?.setDrums(on);
      refresh();
    },
    setLoopVolume(volume) {
      preferences.loopVolume = volume;
      loops?.setLoopVolume(volume);
      refresh();
    },
    toggleRecord() {
      if (state.recording) stopRecording();
      else startRecording();
      refresh();
    },
    togglePlayback() {
      if (state.playingBack) stopPlayback();
      else if (lastRecording) startPlayback();
      refresh();
    },
  };

  const controls = renderControls(
    root,
    {
      kits: kits.map((kit) => ({ id: kit.id, label: getKitLabel(kit) })),
      patterns: PATTERNS.map(({ id, label }) => ({ id, label })),
      bpmRange: { min: MIN_BPM, max: MAX_BPM },
      loopVolume: preferences.loopVolume ?? DEFAULT_LOOP_VOLUME,
    },
    actions,
  );
  refresh();

  return {
    /** À appeler pour chaque événement `hit` venu du clavier ou du pointeur. */
    captureHit(hit) {
      recorder?.capture(hit);
    },
    selectKit,
    /** Kit enregistré dans les préférences du joueur, s'il existe encore. */
    getPreferredKitId() {
      return kits.some((kit) => kit.id === preferences.kitId) ? preferences.kitId : null;
    },
  };
}
