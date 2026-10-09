// Doublures minimales de la Web Audio API et des minuteries pour les tests.

function createParam(value = 0) {
  return {
    value,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
    linearRampToValueAtTime() {},
    setTargetAtTime(target) {
      this.value = target;
    },
  };
}

function createNode(extra = {}) {
  return {
    connections: [],
    connect(target) {
      this.connections.push(target);
      return target;
    },
    disconnect() {
      this.connections = [];
    },
    ...extra,
  };
}

export function createFakeContext() {
  const context = {
    currentTime: 0,
    sampleRate: 8000,
    destination: createNode(),
    started: [],
    createGain: () => createNode({ gain: createParam(1) }),
    createBiquadFilter: () => createNode({ type: '', frequency: createParam() }),
    createOscillator: () =>
      createNode({
        type: '',
        frequency: createParam(),
        detune: createParam(),
        start(time) {
          context.started.push({ kind: 'osc', type: this.type, time });
        },
        stop() {},
      }),
    createBufferSource: () =>
      createNode({
        buffer: null,
        start(time) {
          context.started.push({ kind: 'noise', time });
        },
        stop() {},
      }),
    createBuffer: (channels, length) => ({ getChannelData: () => new Float32Array(length) }),
  };
  return context;
}

// Minuterie pilotée à la main : rien ne s'exécute tout seul.
export function createFakeTimer() {
  let nextId = 1;
  const intervals = new Map();
  const timeouts = new Map();
  return {
    setInterval(fn) {
      intervals.set(nextId, fn);
      return nextId++;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
    setTimeout(fn, ms) {
      timeouts.set(nextId, { fn, ms });
      return nextId++;
    },
    clearTimeout(id) {
      timeouts.delete(id);
    },
    runIntervals() {
      for (const fn of [...intervals.values()]) fn();
    },
    runTimeouts() {
      for (const [id, { fn }] of [...timeouts]) {
        timeouts.delete(id);
        fn();
      }
    },
    get activeIntervals() {
      return intervals.size;
    },
  };
}
