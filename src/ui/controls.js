// Commandes de jeu : kit, boucle, tempo, métronome, enregistrement.
// Ce module ne fait que construire et mettre à jour le DOM ; les actions
// sont fournies par l'appelant. Les éléments vont dans la zone `#transport`
// préparée par l'interface, qui fournit les classes `.control` et `.btn*`.

const BEATS_PER_BAR = 4;

/**
 * @typedef {object} ControlsState
 * @property {string|null} kitId
 * @property {boolean} kitLoading
 * @property {string|null} patternId
 * @property {boolean} playing
 * @property {number} bpm
 * @property {boolean} metronome
 * @property {boolean} drums
 * @property {boolean} recording
 * @property {boolean} hasRecording
 * @property {boolean} playingBack
 */

function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (name === 'text') element.textContent = value;
    else element.setAttribute(name, value);
  }
  element.append(...children);
  return element;
}

function createGroup(label, children) {
  return createElement('div', { class: 'control', role: 'group', 'aria-label': label }, children);
}

function createOption(value, label) {
  return createElement('option', { value, text: label });
}

/**
 * Construit les commandes dans `root`.
 * @param {HTMLElement} root  la zone `#transport`
 * @param {object} options
 * @param {{ id: string, label: string }[]} options.kits
 * @param {{ id: string, label: string }[]} options.patterns
 * @param {{ min: number, max: number }} options.bpmRange
 * @param {number} options.loopVolume
 * @param {object} actions
 * @param {(id: string) => void} actions.selectKit
 * @param {(id: string|null) => void} actions.selectPattern
 * @param {() => void} actions.togglePlay
 * @param {(bpm: number) => void} actions.setBpm
 * @param {(on: boolean) => void} actions.setMetronome
 * @param {(on: boolean) => void} actions.setDrums
 * @param {(volume: number) => void} actions.setLoopVolume
 * @param {() => void} actions.toggleRecord
 * @param {() => void} actions.togglePlayback
 * @returns {{ update(state: ControlsState): void, showBeat(beat: number|null): void }}
 */
export function renderControls(root, { kits, patterns, bpmRange, loopVolume }, actions) {
  const kitSelect = createElement('select', { id: 'kit-select' }, kits.map((kit) => createOption(kit.id, kit.label)));
  const patternSelect = createElement('select', { id: 'pattern-select' }, [
    createOption('', 'Aucune'),
    ...patterns.map((pattern) => createOption(pattern.id, pattern.label)),
  ]);
  const drumsInput = createElement('input', { id: 'drums-input', type: 'checkbox' });
  const playButton = createElement('button', { type: 'button', class: 'btn btn--primary' });
  const bpmInput = createElement('input', {
    id: 'bpm-input',
    type: 'range',
    min: String(bpmRange.min),
    max: String(bpmRange.max),
    step: '1',
  });
  const bpmOutput = createElement('output', { for: 'bpm-input', class: 'music-controls__bpm' });
  const metronomeInput = createElement('input', { id: 'metronome-input', type: 'checkbox' });
  const beatDots = Array.from({ length: BEATS_PER_BAR }, () => createElement('span', { class: 'music-controls__beat' }));
  const volumeInput = createElement('input', {
    id: 'loop-volume',
    type: 'range',
    min: '0',
    max: '1',
    step: '0.05',
    value: String(loopVolume),
  });
  const recordButton = createElement('button', { type: 'button', class: 'btn btn--record' });
  const playbackButton = createElement('button', { type: 'button', class: 'btn' });

  root.append(
    createGroup('Kit', [createElement('label', { for: 'kit-select', text: 'Kit' }), kitSelect]),
    createGroup('Boucle', [createElement('label', { for: 'pattern-select', text: 'Boucle' }), patternSelect,
      createElement('label', { class: 'music-controls__toggle' }, [drumsInput, ' Batterie']),
      playButton,
    ]),
    createGroup('Tempo', [
      createElement('label', { for: 'bpm-input', text: 'Tempo' }),
      bpmInput,
      bpmOutput,
      createElement('label', { class: 'music-controls__toggle' }, [metronomeInput, ' Métronome']),
      createElement('span', { class: 'music-controls__beats', 'aria-hidden': 'true' }, beatDots),
    ]),
    createGroup('Volume des boucles', [createElement('label', { for: 'loop-volume', text: 'Volume boucles' }), volumeInput]),
    createGroup('Enregistrement', [recordButton, playbackButton]),
  );

  kitSelect.addEventListener('change', () => actions.selectKit(kitSelect.value));
  patternSelect.addEventListener('change', () => actions.selectPattern(patternSelect.value || null));
  drumsInput.addEventListener('change', () => actions.setDrums(drumsInput.checked));
  playButton.addEventListener('click', () => actions.togglePlay());
  bpmInput.addEventListener('input', () => actions.setBpm(Number(bpmInput.value)));
  metronomeInput.addEventListener('change', () => actions.setMetronome(metronomeInput.checked));
  volumeInput.addEventListener('input', () => actions.setLoopVolume(Number(volumeInput.value)));
  recordButton.addEventListener('click', () => actions.toggleRecord());
  playbackButton.addEventListener('click', () => actions.togglePlayback());

  return {
    update(state) {
      if (state.kitId) kitSelect.value = state.kitId;
      kitSelect.disabled = state.kitLoading;
      patternSelect.value = state.patternId ?? '';
      drumsInput.checked = state.drums;
      playButton.textContent = state.playing ? 'Arrêter' : 'Lancer';
      playButton.setAttribute('aria-pressed', String(state.playing));
      playButton.disabled = !state.patternId && !state.metronome && !state.playing;
      bpmInput.value = String(state.bpm);
      bpmOutput.textContent = `${state.bpm} BPM`;
      metronomeInput.checked = state.metronome;
      recordButton.textContent = state.recording ? 'Arrêter l’enregistrement' : 'Enregistrer';
      recordButton.setAttribute('aria-pressed', String(state.recording));
      recordButton.disabled = state.playingBack;
      playbackButton.textContent = state.playingBack ? 'Arrêter la réécoute' : 'Réécouter';
      playbackButton.disabled = !state.hasRecording || state.recording;
      root.classList.toggle('is-recording', state.recording);
    },
    showBeat(beat) {
      beatDots.forEach((dot, index) => {
        dot.classList.toggle('is-active', index === beat);
        dot.classList.toggle('is-downbeat', index === 0 && beat === 0);
      });
    },
  };
}
