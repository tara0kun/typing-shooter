/**
 * Sound effects made in code with Web Audio (no audio files, no music): a shot that climbs one step with each letter of
 * the word, a miss, a kill, and a zombie reaching the barricade. M toggles them on the title and pause screens.
 */
export type Sound = 'shot' | 'miss' | 'kill' | 'hurt';
type At = { ac: BaseAudioContext; out: AudioNode; t: number };

const SCALE = [0, 2, 4, 5, 7, 9, 11, 12]; // semitones of a major scale: the letters of a word go up it, an octave at most
const noises = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Half a second of white noise per context, made once and reused by every burst. */
function noise(ac: BaseAudioContext): AudioBuffer {
  let b = noises.get(ac);
  if (!b) {
    b = ac.createBuffer(1, Math.ceil(ac.sampleRate / 2), ac.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noises.set(ac, b);
  }
  return b;
}

/** Up to `peak` in 2 ms, then down to silence over `len` s (exponential ramps cannot reach 0, so 0.0001 stands for it). */
function envelope(at: At, peak: number, len: number): GainNode {
  const g = at.ac.createGain();
  g.gain.setValueAtTime(0.0001, at.t);
  g.gain.exponentialRampToValueAtTime(peak, at.t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, at.t + len);
  return g;
}

/** Noise through a filter whose frequency falls from `from` to `to`; a new slice of the noise each time, so no two sound alike. */
function burst(at: At, len: number, peak: number, type: BiquadFilterType, from: number, to = from) {
  const src = at.ac.createBufferSource();
  src.buffer = noise(at.ac);
  const filter = at.ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(from, at.t);
  filter.frequency.exponentialRampToValueAtTime(to, at.t + len);
  src.loop = true; // a slice that starts late in the buffer wraps round instead of ending before its envelope does
  src.connect(filter).connect(envelope(at, peak, len)).connect(at.out);
  src.start(at.t, Math.random() * 0.4);
  src.stop(at.t + len + 0.02);
}

function tone(at: At, type: OscillatorType, from: number, to: number, len: number, peak: number) {
  const osc = at.ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at.t);
  osc.frequency.exponentialRampToValueAtTime(to, at.t + len);
  osc.connect(envelope(at, peak, len)).connect(at.out);
  osc.start(at.t);
  osc.stop(at.t + len + 0.02);
}

/** Each sound, drawn into any context at a given time: the game plays them live; an OfflineAudioContext can render them to measure. */
export const SOUNDS: Record<Sound, (at: At, letter: number) => void> = {
  shot: (at, letter) => {
    burst(at, 0.12, 0.5, 'lowpass', 6000, 600); // a crack that dulls fast
    const f = 660 * 2 ** (SCALE[Math.min(Math.max(0, letter), SCALE.length - 1)] / 12);
    tone(at, 'square', f, f / 2, 0.05, 0.1);
  },
  miss: (at) => {
    burst(at, 0.05, 0.25, 'lowpass', 900, 300); // a dull click: the round went wide
    tone(at, 'triangle', 150, 90, 0.09, 0.4);
  },
  kill: (at) => {
    tone(at, 'sine', 150, 40, 0.3, 0.6);
    burst(at, 0.14, 0.45, 'lowpass', 1100, 300);
  },
  hurt: (at) => {
    burst(at, 0.35, 0.6, 'lowpass', 800);
    tone(at, 'square', 220, 55, 0.2, 0.25);
  },
};

/**
 * The master volume. No compressor: with the defaults it squashes and lifts everything. Instead the loudest pile-up was
 * measured in a browser (all four sounds at once, then a shot every 1/12 s, rendered offline): peak 0.69-0.75 at this
 * gain (the noise varies), below 0.9. npm test cannot do that (Node has no Web Audio): measure again after making a sound louder.
 */
export function master(ac: BaseAudioContext): AudioNode {
  const gain = ac.createGain();
  gain.gain.value = 0.5;
  gain.connect(ac.destination);
  return gain;
}

let live: { ac: AudioContext; out: AudioNode } | null = null;
export let muted = false;
export const toggleMute = () => (muted = !muted);

/** Called on every key: a key press is what lets a page start sound, so the context is made (or resumed) there. */
export function unlock() {
  try {
    if (!live) {
      const ac = new AudioContext();
      live = { ac, out: master(ac) };
    }
    if (live.ac.state !== 'running') live.ac.resume().catch(() => {}); // pending until allowed; 'interrupted' tries again next key
  } catch {
    // no sound here (not supported or refused): the game goes on without it
  }
}

export function play(sound: Sound, letter = 0) {
  // only while running: sounds put on a stopped clock would all come out at once when it starts
  if (muted || live?.ac.state !== 'running') return;
  SOUNDS[sound]({ ac: live.ac, out: live.out, t: live.ac.currentTime }, letter);
}
