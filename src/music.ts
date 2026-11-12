/**
 * The music, made in code like the sound effects (no audio files): an original tune in C# minor, a key that holds every note
 * of the shots' rising scale (E major), so typing stays in its key (only the G# chord's B#, against the 5th or 6th letter's
 * shot, and the boss's D chord, against the 6th or 7th, rub a half step). 'night' plays on the title and through the waves,
 * 'boss' once a boss is coming (and for the long passage's giant). It stops in the pause and on the results. B turns it off
 * and on (on the title and the pause screens), M the sound effects.
 */
import { burst, live, tone, type At } from './sound.ts';

export type Section = 'night' | 'boss';
export type Voice = 'lead' | 'bass' | 'arp' | 'kick' | 'snare' | 'hat';
export type Note = { voice: Voice; note: number; steps: number }; // a MIDI note number (0 for a drum), held for sixteenths

const NAMES: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

/** A note's MIDI number ('a4' is 69, 'c#5' 73, 'b#4' 72); without an octave, its pitch class (0-11). NaN for anything else. */
export function midi(name: string): number {
  const m = /^([a-g])(#?)(\d?)$/.exec(name);
  if (!m) return NaN;
  const pc = NAMES[m[1]] + m[2].length;
  return m[3] ? 12 * (Number(m[3]) + 1) + pc : pc % 12;
}

/**
 * A section as written: its tempo; a chord a bar (its notes, the root first; '|' between bars); the tune, 8 eighths a bar
 * ('.' a rest, '-' holds the note before). Then one bar of sixteenths each, the same in every bar: the bass ('r' the chord's
 * root, 'o' an octave up; each holds until the next), the broken chord (its notes from the lowest: 0, 1, 2), the drums ('x').
 */
function read(s: { bpm: number; chords: string; tune: string; bass: string; arp: string; kick: string; snare: string; hat: string }) {
  const bars = (text: string) => text.split('|').map((bar) => bar.trim().split(/\s+/));
  return { ...s, chords: bars(s.chords), tune: bars(s.tune) };
}

export const SONG: Record<Section, ReturnType<typeof read>> = {
  night: read({
    bpm: 120,
    chords: 'c# e g# | a c# e | e g# b | b d# f# | c# e g# | a c# e | f# a c# | g# b# d# | a c# e | b d# f# | g# b d# | c# e g# | a c# e | b d# f# | c# e g# | g# b# d#',
    tune: `g#4 . c#5 . e5 . d#5 c#5 | b4 - - - . . g#4 a4 | b4 . e5 . g#5 . f#5 e5 | d#5 - - - . . e5 d#5 |
      c#5 . g#4 . c#5 . e5 . | a4 - - - . . e5 f#5 | a5 - g#5 - f#5 - c#5 - | d#5 - - - b#4 - - - |
      c#5 - - e5 - - a5 - | g#5 - - f#5 - - d#5 - | g#5 - - - d#5 - b4 - | c#5 - - - - - . . |
      c#5 - - e5 - - a5 - | b5 - - a5 - - f#5 - | g#5 - - - e5 - c#5 - | f#5 - - - d#5 - b#4 -`,
    bass: 'r.....r.....o...', // 3 + 3 + 2 eighths, the last an octave up
    arp: '0.2.1.2.0.2.1.2.',
    kick: 'x.....x...x.....',
    snare: '....x.......x...',
    hat: '..x...x...x...x.',
  }),
  // faster, the bass in octaves and the chord in sixteenths; its D (a half step over the key's root) is the one chord from
  // outside the key (G#'s B# is the key's own leading tone), the darkest way back to it
  boss: read({
    bpm: 140,
    chords: 'c# e g# | c# e g# | a c# e | b d# f# | c# e g# | c# e g# | d f# a | g# b# d# | a c# e | b d# f# | g# b d# | c# e g# | a c# e | b d# f# | d f# a | g# b# d#',
    tune: `c#5 - c#5 - g#4 - c#5 e5 | d#5 - - - c#5 - b4 - | c#5 - c#5 - a4 - c#5 e5 | f#5 - - - e5 - d#5 - |
      e5 - e5 - c#5 - e5 g#5 | a5 - - - g#5 - e5 - | f#5 - - - a5 - - - | g#5 - - - f#5 - d#5 - |
      e5 - - - c#5 - e5 - | f#5 - - - d#5 - f#5 - | g#5 - - - b5 - - - | g#5 - - - - - - - |
      a5 - - - e5 - a5 - | b5 - - - f#5 - b5 - | a5 - - - f#5 - d5 - | b#4 - - - d#5 - g#5 -`,
    bass: 'r.o.r.o.r.o.r.o.',
    arp: '0121012101210121',
    kick: 'x...x...x...x...',
    snare: '....x.......x...',
    hat: '..x...x...x...x.',
  }),
};

export const stepsOf = (section: Section) => SONG[section].chords.length * 16;
export const sixteenth = (section: Section) => 60 / SONG[section].bpm / 4;

/** A pitch class put at its first MIDI number from `low` up. */
const place = (pc: number, low: number) => low + ((((pc - low) % 12) + 12) % 12);

/**
 * What starts at a sixteenth of a section: the tune's note (held through its '-', not past the section's end), the bass (its
 * root between A1 and G#2), the broken chord's note (the chord put between G#3 and G4, so it moves little from chord to
 * chord) and the drums.
 */
export function notes(section: Section, step: number): Note[] {
  const s = SONG[section];
  const i = step % 16;
  const chord = s.chords[Math.floor(step / 16)].map(midi);
  const eighth = (e: number) => s.tune[Math.floor(e / 8)]?.[e % 8];
  const out: Note[] = [];
  const t = (i % 2 === 0 && eighth(step / 2)) || '.';
  if (t !== '.' && t !== '-') {
    let len = 1;
    while (eighth(step / 2 + len) === '-') len++;
    out.push({ voice: 'lead', note: midi(t), steps: 2 * len });
  }
  if (s.bass[i] !== '.') {
    let len = 1;
    while (i + len < 16 && s.bass[i + len] === '.') len++;
    out.push({ voice: 'bass', note: place(chord[0], 33) + (s.bass[i] === 'o' ? 12 : 0), steps: len });
  }
  if (s.arp[i] !== '.') out.push({ voice: 'arp', note: chord.map((pc) => place(pc, 56)).sort((a, b) => a - b)[Number(s.arp[i])], steps: 1 });
  for (const drum of ['kick', 'snare', 'hat'] as const) if (s[drum][i] === 'x') out.push({ voice: drum, note: 0, steps: 1 });
  return out;
}

const hz = (n: number) => 440 * 2 ** ((n - 69) / 12);

/**
 * A held note through a low-pass: up in 10 ms, settling to 60%, let go 40 ms before its end (a repeated note is heard
 * twice). With `vibrato` (cents), a long note starts to waver after 0.15 s.
 */
function held(at: At, type: OscillatorType, n: number, len: number, peak: number, cutoff: number, vibrato = 0) {
  const osc = at.ac.createOscillator();
  osc.type = type;
  osc.frequency.value = hz(n);
  const filter = at.ac.createBiquadFilter(); // a low-pass unless told otherwise
  filter.frequency.value = cutoff;
  const g = at.ac.createGain();
  g.gain.value = 0; // silent until it starts (see envelope in sound.ts)
  g.gain.setValueAtTime(0, at.t);
  g.gain.linearRampToValueAtTime(peak, at.t + 0.01);
  g.gain.setTargetAtTime(peak * 0.6, at.t + 0.01, 0.1);
  g.gain.setTargetAtTime(0, at.t + len - 0.04, 0.015);
  osc.connect(filter).connect(g).connect(at.out);
  const end = at.t + len + 0.1;
  osc.start(at.t);
  osc.stop(end);
  if (vibrato && len > 0.3) {
    const lfo = at.ac.createOscillator();
    lfo.frequency.value = 5.5;
    const depth = at.ac.createGain();
    depth.gain.value = 0;
    depth.gain.setValueAtTime(0, at.t + 0.15);
    depth.gain.linearRampToValueAtTime(vibrato, at.t + Math.min(len, 0.5));
    lfo.connect(depth).connect(osc.detune);
    lfo.start(at.t);
    lfo.stop(end);
  }
}

export const VOICES: Record<Voice, (at: At, n: number, len: number) => void> = {
  lead: (at, n, len) => held(at, 'square', n, len, 0.06, 2200, 20),
  bass: (at, n, len) => held(at, 'sawtooth', n, len, 0.12, 500),
  arp: (at, n) => tone(at, 'triangle', hz(n), hz(n), 0.2, 0.05),
  kick: (at) => tone(at, 'sine', 100, 40, 0.12, 0.22), // shorter and softer than a kill's thump
  snare: (at) => {
    burst(at, 0.12, 0.09, 'highpass', 1500);
    tone(at, 'triangle', 200, 140, 0.06, 0.1);
  },
  hat: (at) => burst(at, 0.04, 0.06, 'highpass', 7000),
};

/** A sixteenth of a section, drawn into any context at a given time: the game plays it live; an OfflineAudioContext can render it to measure. */
export function playStep(at: At, section: Section, step: number) {
  for (const n of notes(section, step)) VOICES[n.voice](at, n.note, n.steps * sixteenth(section));
}

const AHEAD = 0.2; // s of the tune put on the clock ahead (the frames drive it: one late by less than this leaves no gap)
const FADE = 0.01; // s, the time constant of a stop's fade: 20 dB down in 23 ms, quick but without a click
const HEARD = 2 * FADE; // a step that starts this soon after a stop is heard as the fade's tail (later, from 17 dB down: not)
type Due = { section: Section; step: number; t: number };
/** Where the tune is, and the steps put on the clock that have not begun yet. It keeps its place through a stop, unless a game was left. */
export const tune = { section: 'night' as Section, step: 0, next: 0, on: false, fresh: false, ahead: [] as Due[] };

/**
 * The steps due before `now + AHEAD` for the section wanted (null: none), with their times. A new section starts from its
 * top: at once after a stop, else on the next bar line. A stop fades out the steps on the clock, and the tune goes on from the
 * first that starts too late in the fade to be heard. A clock that ran on without the tune (a hidden tab) starts it again
 * just after now, from its place, instead of playing every missed note at once.
 */
export function due(want: Section | null, now: number): Due[] {
  tune.ahead = tune.ahead.filter((d) => d.t > now);
  if (!want) {
    const unheard = tune.ahead.find((d) => d.t > now + HEARD);
    if (tune.on && unheard) Object.assign(tune, { section: unheard.section, step: unheard.step });
    Object.assign(tune, { on: false, ahead: [] });
    return [];
  }
  if (!tune.on || tune.next < now) {
    if (!tune.on && (tune.fresh || want !== tune.section)) Object.assign(tune, { section: want, step: 0, fresh: false });
    Object.assign(tune, { next: now + 0.05, on: true });
  }
  const out: Due[] = [];
  while (tune.next < now + AHEAD) {
    if (tune.step % 16 === 0 && want !== tune.section) Object.assign(tune, { section: want, step: 0 });
    out.push({ section: tune.section, step: tune.step, t: tune.next });
    tune.next += sixteenth(tune.section);
    tune.step = (tune.step + 1) % stepsOf(tune.section);
  }
  tune.ahead.push(...out);
  return out;
}

/** A game left (the results, or the title from the pause): the next time the tune starts, it starts from its top. */
export function fromTop() {
  tune.fresh = true;
}

/**
 * The music's volume, under the effects: measured in a browser (rendered offline; loudness as BS.1770 weighs it), the night
 * 4-5 LU and the boss 3-4 LU quieter than a typist at 5 keys a second (the typing's noise varies a little), and the worst
 * pile-up of effects over its loudest moments peaks below 0.9. npm test cannot do that (Node has no Web Audio): measure
 * again after making it louder.
 */
export const LEVEL = 0.6;
export let musicOn = true;
export const toggleMusic = () => (musicOn = !musicOn);
let bus: GainNode | null = null; // the music's fader: a new one each start, so what a stop left on the clock fades out with the old one

/** Called every frame with the section the screen wants (null: none). */
export function music(want: Section | null) {
  if (!live) return;
  const { ac, out } = live;
  if (!musicOn) want = null;
  if (!want) {
    // a stop gets through on a clock that is not running too (suspended; 'interrupted' on Safari): the fade waits there
    bus?.gain.setTargetAtTime(0, ac.currentTime, FADE); // what is already on the clock fades out
    bus = null;
    due(null, ac.currentTime);
    return;
  }
  if (ac.state !== 'running') return; // nothing to put on a clock that is not running (the tune goes on once it runs)
  if (!bus) {
    bus = ac.createGain();
    bus.gain.value = LEVEL;
    bus.connect(out);
  }
  for (const d of due(want, ac.currentTime)) playStep({ ac, out: bus, t: d.t }, d.section, d.step);
}
