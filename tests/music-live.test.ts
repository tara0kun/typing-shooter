// The music as the page plays it, through a stand-in for Web Audio (Node has none) that only records what is made, how it
// is wired and what is put on its clock. A file of its own: the page's sound state (the context, the fader, M and B) is
// shared by everything that imports it, and each test file runs in a process of its own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL, VOICES, music, notes, playStep, sixteenth, stepsOf, toggleMusic, tune, type Section, type Voice } from '../src/music.ts';
import { live, play, toggleMute, unlock } from '../src/sound.ts';

class Param {
  value: number;
  events: (string | number)[][] = [];
  constructor(value: number) {
    this.value = value;
  }
  setValueAtTime(v: number, t: number) {
    this.events.push(['set', v, t]);
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.events.push(['lin', v, t]);
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    this.events.push(['exp', v, t]);
  }
  setTargetAtTime(v: number, t: number, c: number) {
    this.events.push(['target', v, t, c]);
  }
}

class FakeNode {
  kind: string;
  out: object[] = [];
  type = '';
  loop = false;
  buffer: unknown = null;
  startAt = -1;
  stopAt = -1;
  gain = new Param(1); // the defaults of Web Audio: a gain of 1, an oscillator at 440 Hz
  frequency = new Param(440);
  detune = new Param(0);
  constructor(kind: string) {
    this.kind = kind;
  }
  connect<T extends object>(to: T) {
    this.out.push(to);
    return to;
  }
  start(t = 0) {
    this.startAt = t;
  }
  stop(t = 0) {
    this.stopAt = t;
  }
}

class FakeContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 48000;
  destination = new FakeNode('destination');
  made: FakeNode[] = [];
  make(kind: string) {
    const n = new FakeNode(kind);
    this.made.push(n);
    return n;
  }
  createGain() {
    return this.make('gain');
  }
  createOscillator() {
    return this.make('osc');
  }
  createBiquadFilter() {
    return this.make('filter');
  }
  createBufferSource() {
    return this.make('source');
  }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
}
(globalThis as { AudioContext?: unknown }).AudioContext = FakeContext;

const hz = (n: number) => 440 * 2 ** ((n - 69) / 12); // A440, equal steps
// an oscillator's pitch: set as its value (a held note) or as its first scheduled value (a short one)
const pitch = (o: FakeNode) => (o.frequency.events[0]?.[0] === 'set' ? Number(o.frequency.events[0][1]) : o.frequency.value);

test('every voice sounds from its time and stops', () => {
  for (const voice of Object.keys(VOICES) as Voice[]) {
    const ac = new FakeContext();
    VOICES[voice]({ ac: ac as unknown as BaseAudioContext, out: ac.destination as unknown as AudioNode, t: 1 }, 64, 0.5);
    const sources = ac.made.filter((n) => n.kind === 'osc' || n.kind === 'source');
    assert.ok(sources.length > 0 && sources.every((s) => s.startAt === 1 && s.stopAt > 1), voice);
  }
});

test("each step's tune, bass and broken chord at their pitch, the tune and bass for their length; every sound starts silent and every source stops", () => {
  for (const name of ['night', 'boss'] as Section[]) {
    for (let step = 0; step < stepsOf(name); step++) {
      const ac = new FakeContext();
      playStep({ ac: ac as unknown as BaseAudioContext, out: ac.destination as unknown as AudioNode, t: 1 }, name, step);
      const oscs = ac.made.filter((n) => n.kind === 'osc');
      for (const n of notes(name, step)) {
        if (n.voice !== 'lead' && n.voice !== 'bass' && n.voice !== 'arp') continue;
        const at = `${name} step ${step} ${n.voice}`;
        const o = oscs.find((x) => Math.abs(pitch(x) - hz(n.note)) < 1e-9);
        assert.ok(o, `${at}: no oscillator at ${hz(n.note).toFixed(2)} Hz`);
        const len = n.steps * sixteenth(name);
        if (n.voice !== 'arp') assert.ok(o.stopAt > 1 + len && o.stopAt <= 1 + len + 0.2, `${at}: stops at ${o.stopAt}, held ${len}`);
      }
      // a gain left at its default 1 until its first event lets a source's first frame through at full level (a click)
      for (const g of ac.made.filter((n) => n.kind === 'gain')) assert.ok(g.gain.value <= 0.0001, `${name} step ${step}: a gain starts at ${g.gain.value}`);
      for (const s of ac.made.filter((n) => n.kind === 'osc' || n.kind === 'source')) assert.ok(s.startAt >= 1 && s.stopAt > s.startAt, `${name} step ${step}: a ${s.kind} not stopped`);
    }
  }
});

test('in the page: nothing before a key, then through its own fader at LEVEL; B stops and starts it, M is the effects only, a stop gets through a stopped clock', () => {
  music('night');
  assert.equal(live, null);
  assert.equal(tune.on, false, 'no music before the first key');

  unlock();
  const ac = live!.ac as unknown as FakeContext;
  const master = live!.out as unknown as FakeNode;
  ac.currentTime = 1;
  music('night');
  const into = (to: object) => ac.made.filter((n) => n.out.includes(to));
  const [bus] = into(master);
  assert.equal(into(master).length, 1, 'only the fader goes into the master');
  assert.equal(bus.gain.value, LEVEL);
  assert.ok(tune.on && into(bus).length > 0);

  // B: the fader fades out at once; nothing more is put on the clock
  toggleMusic();
  ac.currentTime = 1.1;
  music('night');
  assert.deepEqual(bus.gain.events.at(-1), ['target', 0, 1.1, 0.01]);
  assert.equal(tune.on, false);
  let made = ac.made.length;
  ac.currentTime = 1.2;
  music('night');
  assert.equal(ac.made.length, made, 'nothing put on the clock while the music is off');
  // B again: a new fader (the old one stays faded with what was put on it)
  toggleMusic();
  ac.currentTime = 1.3;
  music('night');
  const bus2 = into(master).find((n) => n !== bus);
  assert.ok(bus2 && bus2.gain.value === LEVEL && bus2.gain.events.length === 0, 'a new fader');
  assert.equal(tune.on, true);

  // M: the effects off, the music goes on
  toggleMute();
  made = ac.made.length;
  play('shot', 0);
  assert.equal(ac.made.length, made, 'no effect while M is off');
  ac.currentTime = 1.6; // its 5th sixteenth comes on the clock (the 4th has no note)
  music('night');
  assert.ok(tune.on && ac.made.length > made, 'the music goes on');
  toggleMute();

  // a clock that stops running (suspended; 'interrupted' on Safari): a stop gets through, its fade waits there
  ac.state = 'suspended';
  music(null);
  assert.deepEqual(bus2.gain.events.at(-1), ['target', 0, 1.6, 0.01]);
  assert.equal(tune.on, false);
  made = ac.made.length;
  music('boss');
  assert.equal(ac.made.length, made, 'nothing put on a clock that is not running');
  ac.state = 'running';
  ac.currentTime = 1.7;
  music('boss');
  assert.deepEqual([tune.on, tune.section], [true, 'boss'], 'after a stop, the boss from its top at once');
});
