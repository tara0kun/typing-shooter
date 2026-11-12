import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SONG, due, fromTop, midi, notes, sixteenth, stepsOf, tune, type Section } from '../src/music.ts';

const SECTIONS: Section[] = ['night', 'boss'];
const SCALE = ['c#', 'd#', 'e', 'f#', 'g#', 'a', 'b']; // C# minor, as written
// the chords from outside it: G# (its B# is the key's own leading tone), and the boss's D
const OUTSIDE: Record<Section, string[]> = { night: ['g# b# d#'], boss: ['g# b# d#', 'd f# a'] };

test('note names read as MIDI numbers', () => {
  assert.deepEqual(['a4', 'c#5', 'b#4', 'c#', 'b#', 'e'].map(midi), [69, 73, 72, 1, 0, 4]);
  for (const bad of ['h4', 'c##4', 'C4', '-', '.', '']) assert.ok(Number.isNaN(midi(bad)), bad);
});

test('each section is whole bars: a chord and 8 eighths of the tune a bar, and the patterns a bar of sixteenths', () => {
  for (const name of SECTIONS) {
    const s = SONG[name];
    assert.equal(s.tune.length, s.chords.length, name);
    s.tune.forEach((bar, i) => {
      assert.equal(bar.length, 8, `${name} bar ${i + 1}: ${bar.join(' ')}`);
      for (const t of bar) assert.ok(t === '.' || t === '-' || !Number.isNaN(midi(t)), `${name} bar ${i + 1}: ${t}`);
    });
    s.chords.forEach((chord, i) => assert.ok(chord.length === 3 && chord.every((n) => !Number.isNaN(midi(n))), `${name} chord ${i + 1}`));
    assert.notEqual(s.tune[0][0], '-', 'nothing to hold at the start');
    assert.match(s.bass, /^[ro.]{16}$/);
    assert.match(s.arp, /^[012.]{16}$/);
    for (const drum of [s.kick, s.snare, s.hat]) assert.match(drum, /^[x.]{16}$/);
    assert.equal(stepsOf(name), 16 * s.chords.length);
  }
  assert.equal(sixteenth('night'), 60 / 120 / 4);
  assert.equal(sixteenth('boss'), 60 / 140 / 4);
});

test("every note is spelled in the key or in its bar's chord, every chord is the key's or one of the two from outside (a sharp left out is not), the tune between G#4 and B5", () => {
  for (const name of SECTIONS) {
    SONG[name].chords.forEach((chord, bar) => {
      const at = `${name} bar ${bar + 1}`;
      assert.ok(chord.every((n) => SCALE.includes(n)) || OUTSIDE[name].includes(chord.join(' ')), `${at}: ${chord.join(' ')}`);
      for (const t of SONG[name].tune[bar]) {
        if (t === '.' || t === '-') continue;
        const n = t.replace(/\d$/, '');
        assert.ok(SCALE.includes(n) || chord.includes(n), `${at}: ${t}`);
        assert.ok(midi(t) >= midi('g#4') && midi(t) <= midi('b5'), `${at}: ${t}`);
      }
    });
  }
});

test('what starts on a sixteenth: the tune held through its dashes, the bass to its next note, the chord low and close, the drums', () => {
  // night, bar 1: g#4 then a rest; the bass's root C#2 for 3 eighths; the chord C#m from G#3
  assert.deepEqual(notes('night', 0), [
    { voice: 'lead', note: midi('g#4'), steps: 2 },
    { voice: 'bass', note: midi('c#2'), steps: 6 },
    { voice: 'arp', note: midi('g#3'), steps: 1 },
    { voice: 'kick', note: 0, steps: 1 },
  ]);
  assert.equal(notes('night', 2).find((n) => n.voice === 'arp')?.note, midi('e4')); // the chord's top (2)
  // the bar's last bass note an octave up for 2 eighths; the snare on the 4th beat
  assert.deepEqual(notes('night', 12), [
    { voice: 'lead', note: midi('d#5'), steps: 2 },
    { voice: 'bass', note: midi('c#3'), steps: 4 },
    { voice: 'arp', note: midi('c#4'), steps: 1 },
    { voice: 'snare', note: 0, steps: 1 },
  ]);
  assert.deepEqual(notes('night', 16)[0], { voice: 'lead', note: midi('b4'), steps: 8 }); // b4 - - -
  assert.equal(notes('night', 16)[1].note, midi('a1')); // A's root, the lowest the bass goes
  assert.deepEqual(notes('night', 176)[0], { voice: 'lead', note: midi('c#5'), steps: 12 }); // c#5 - - - - - (then rests)
  assert.deepEqual(notes('boss', 176)[0], { voice: 'lead', note: midi('g#5'), steps: 16 }); // a whole bar
  assert.deepEqual(notes('night', 1), []); // between the eighths: nothing starts
  assert.deepEqual(notes('night', 252)[0], { voice: 'lead', note: midi('b#4'), steps: 4 }); // the last note: held to the end, not round
  assert.deepEqual(notes('boss', 236).slice(0, 2), [
    { voice: 'lead', note: midi('d5'), steps: 4 },
    { voice: 'bass', note: midi('d2'), steps: 2 },
  ]);
});

test("every step of both sections: whole note numbers in their ranges, the bass on its bar's root, the broken chord from its bar's chord, each voice where written", () => {
  for (const name of SECTIONS) {
    const s = SONG[name];
    for (let step = 0; step < stepsOf(name); step++) {
      const i = step % 16;
      const chord = s.chords[Math.floor(step / 16)].map(midi);
      const got = notes(name, step);
      for (const n of got) {
        const at = `${name} step ${step} ${n.voice}`;
        assert.ok(Number.isInteger(n.note) && n.steps >= 1, at); // a NaN would throw in an oscillator, inside the frame loop
        if (n.voice === 'lead') assert.ok(n.note >= midi('g#4') && n.note <= midi('b5'), at);
        if (n.voice === 'bass') {
          const root = n.note - (s.bass[i] === 'o' ? 12 : 0);
          assert.ok(root >= midi('a1') && root <= midi('g#2') && root % 12 === chord[0], at);
        }
        if (n.voice === 'arp') assert.ok(n.note >= midi('g#3') && n.note <= midi('g4') && chord.includes(n.note % 12), at);
      }
      const voices = got.map((n) => n.voice);
      const t = i % 2 === 0 ? s.tune[Math.floor(step / 16)][i / 2] : '.';
      assert.equal(voices.includes('lead'), t !== '.' && t !== '-', `${name} step ${step} lead`);
      assert.equal(voices.includes('bass'), s.bass[i] !== '.', `${name} step ${step} bass`);
      assert.equal(voices.includes('arp'), s.arp[i] !== '.', `${name} step ${step} arp`);
      for (const drum of ['kick', 'snare', 'hat'] as const) assert.equal(voices.includes(drum), s[drum][i] === 'x', `${name} step ${step} ${drum}`);
    }
  }
});

test('the tune is put on the clock just ahead, goes on after a stop from the first step not begun, does not pile up what a hidden tab missed, changes section on a bar line', () => {
  const N = sixteenth('night');
  const B = sixteenth('boss');
  const steps = (d: ReturnType<typeof due>) => d.map((x) => `${x.section} ${x.step}`);
  const reset = (o = {}) => Object.assign(tune, { section: 'night', step: 0, next: 0, on: false, fresh: false, ahead: [], ...o });
  reset();

  let d = due('night', 10);
  assert.deepEqual(steps(d), ['night 0', 'night 1']);
  assert.ok(Math.abs(d[0].t - 10.05) < 1e-9 && Math.abs(d[1].t - d[0].t - N) < 1e-9);
  assert.deepEqual(steps(due('night', 10.2)), ['night 2']); // at 10.3; no step twice
  // a pause at 10.25: step 2 (at 10.3) was on the clock but comes too late in the fade to be heard, so the tune goes on from it
  assert.deepEqual(due(null, 10.25), []);
  assert.equal(tune.on, false);
  d = due('night', 20);
  assert.deepEqual(steps(d), ['night 2', 'night 3']);
  assert.ok(Math.abs(d[0].t - 20.05) < 1e-9);
  // the clock ran on 30 s without a frame (a hidden tab): from its place just after now, no pile of missed notes
  d = due('night', 50);
  assert.deepEqual(steps(d), ['night 4', 'night 5']);
  assert.ok(Math.abs(d[0].t - 50.05) < 1e-9);
  // a frame only a little late (10 ms past the next step's time) too: just after now, not in the past
  d = due('night', 50.31);
  assert.deepEqual(steps(d), ['night 6', 'night 7']);
  assert.ok(Math.abs(d[0].t - 50.36) < 1e-9);

  // a boss comes mid-bar: the night plays to the bar line, then the boss from its top, no gap between
  const all: ReturnType<typeof due> = [];
  for (let now = 50.6; now < 52.9; now += 0.05) all.push(...due('boss', now));
  const first = all.findIndex((x) => x.section === 'boss');
  assert.deepEqual(steps(all.slice(0, first)), [8, 9, 10, 11, 12, 13, 14, 15].map((s) => `night ${s}`));
  assert.equal(all[first].step, 0);
  assert.ok(Math.abs(all[first].t - all[first - 1].t - N) < 1e-9);
  all.slice(first + 1).forEach((x, i) => {
    assert.equal(x.step, i + 1);
    assert.ok(Math.abs(x.t - all[first + i].t - B) < 1e-9);
  });

  // stopped in the boss, wanted back in the night (the title): the night from its top at once
  due(null, 60);
  assert.deepEqual(steps(due('night', 61)), ['night 0', 'night 1']);
  // a bar line in the same section goes on into the next bar
  reset({ step: 15, next: 80.05, on: true });
  assert.deepEqual(steps(due('night', 80)), ['night 15', 'night 16']);
  // the end of a section goes round to its top; a boss wanted there starts on that bar line
  reset({ step: stepsOf('night') - 1, next: 70.05, on: true });
  assert.deepEqual(steps(due('night', 70)), ['night 255', 'night 0']);
  reset({ step: stepsOf('night') - 1, next: 85.05, on: true });
  assert.deepEqual(steps(due('boss', 85)), ['night 255', 'boss 0']);
  // a late frame while the tune plays does not cut into the bar: the boss still waits for the bar line
  reset({ step: 3, next: 95, on: true });
  assert.equal(due('boss', 96)[0].section, 'night');
  // a stop just after the boss's top was put on the clock: after the stop, the boss from its top
  reset({ step: 15, next: 90.05, on: true });
  assert.deepEqual(steps(due('boss', 90)), ['night 15', 'boss 0']);
  due(null, 90.1);
  assert.deepEqual([tune.section, tune.step], ['boss', 0]);

  // a step that starts in the fade's first 20 ms is heard, as the fade's tail: it is not played again after the stop
  reset();
  assert.deepEqual(steps(due('night', 30)), ['night 0', 'night 1']); // 1 at 30.175
  due(null, 30.16);
  assert.deepEqual(steps(due('night', 40)), ['night 2', 'night 3']);

  // a game left (the results, or the title from the pause; the tune still playing at that moment): from its top the next
  // time it starts, in the same section too; a plain pause keeps the place
  reset({ step: 40, on: true, next: 100.05 });
  fromTop();
  due(null, 100);
  assert.deepEqual(steps(due('night', 101)), ['night 0', 'night 1']);
  reset({ step: 40, on: true, next: 100.05 });
  due(null, 100);
  assert.deepEqual(steps(due('night', 101)), ['night 40', 'night 41']);
});
