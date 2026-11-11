import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTACK_TIME, BASE_SPEED, BOSS_BOUNCE, BOSS_EVERY, BOSS_PUSH, CATEGORIES, FALL_TIME, FIELD_W, GIANT_PACE, KINDS, MAGAZINE, MAX_HP,
  PLAYER_X, PRACTICE_WORDS, READ_TIME, RELOAD_TIME, WALK_SLACK, WAVES, WAVE_BREAK, accuracy, difficulty, english, grade, guide,
  hurtOf, japanese, labelWidth, lines, newGame, passages, pools, readable, spawn, spelled, target, typeKey, update, weakKeys, wpm,
  type Game,
} from '../src/game.ts';
import { romajiUnits } from '../src/romaji.ts';
import { WORDS } from '../src/words.ts';

/** A game with spawning switched off (one more zombie is due but never comes), so each test places its own zombies. */
function quiet(): Game {
  const g = newGame();
  g.wave = 1;
  g.toSpawn = 1;
  g.nextSpawnAt = Infinity;
  return g;
}

function typeWord(g: Game, word: string) {
  return [...word].map((ch) => typeKey(g, ch));
}

/** Plays like a perfect typist, killing each zombie as it appears (while there are rounds), until `done`. */
function playUntil(g: Game, done: () => boolean, rand = () => 0.5) {
  for (let i = 0; i < 100_000 && !done(); i++) {
    update(g, 0.05, rand);
    for (let t = target(g); t && g.ammo > 0; t = target(g)) typeKey(g, guide(t).rest[0]);
  }
}

test('target is the leftmost living zombie', () => {
  const g = quiet();
  spawn(g, 'moon', 300, 30);
  const near = spawn(g, 'bone', 200, 30);
  spawn(g, 'fog', 400, 30);
  assert.equal(target(g), near);
});

test('first correct letter locks the target until it dies, even if another overtakes it', () => {
  const g = quiet();
  const a = spawn(g, 'moon', 200, 0);
  const b = spawn(g, 'bone', 300, 0);
  assert.equal(typeKey(g, 'm'), 'hit');
  b.x = 100; // b is now leftmost
  assert.equal(target(g), a);
  assert.equal(typeKey(g, 'b'), 'miss'); // does not jump to b
  assert.deepEqual(typeWord(g, 'oon'), ['hit', 'hit', 'kill']);
  assert.equal(target(g), b);
});

test('a wrong letter is a miss and does not advance', () => {
  const g = quiet();
  const z = spawn(g, 'moon', 200, 30);
  assert.equal(typeKey(g, 'x'), 'miss');
  assert.equal(z.typed, 0);
  assert.equal(g.lockedId, null);
  assert.equal(g.misses, 1);
});

test('typing the whole word kills, counts, and frees the lock', () => {
  const g = quiet();
  const z = spawn(g, 'fog', 200, 30);
  assert.deepEqual(typeWord(g, 'fog'), ['hit', 'hit', 'kill']);
  assert.equal(g.kills, 1);
  assert.equal(g.lockedId, null);
  assert.notEqual(z.diedAt, null);
  assert.equal(target(g), undefined); // dead zombies are not targets
  assert.equal(typeKey(g, 'f'), 'none'); // nothing to shoot is not a miss and uses no round
  assert.equal(g.misses, 0);
  assert.equal(g.ammo, MAGAZINE - 3);
  assert.equal(g.combo, 3); // and does not break the combo
});

test('a killed zombie stops moving and is removed after its fall', () => {
  const g = quiet();
  const z = spawn(g, 'fog', 200, 30);
  typeWord(g, 'fog');
  update(g, FALL_TIME / 2);
  assert.equal(z.x, 200);
  assert.ok(g.zombies.includes(z));
  update(g, FALL_TIME);
  assert.ok(!g.zombies.includes(z));
});

test('a zombie reaching the player costs 1 HP and is removed', () => {
  const g = quiet();
  const z = spawn(g, 'moon', PLAYER_X + 10, 20);
  update(g, 0.4); // moves 8 px, not there yet
  assert.equal(g.hp, MAX_HP);
  update(g, 0.2); // moves 4 more px, reaches the player
  assert.equal(g.hp, MAX_HP - 1);
  assert.ok(!g.zombies.includes(z));
});

test('a half-typed zombie that reaches the player frees the lock', () => {
  const g = quiet();
  spawn(g, 'moon', PLAYER_X + 1, 10);
  const next = spawn(g, 'bone', 300, 0);
  typeKey(g, 'm');
  update(g, 0.5);
  assert.equal(g.lockedId, null);
  assert.equal(target(g), next);
});

test('HP 0 ends the game, and nothing moves or types after that', () => {
  const g = quiet();
  g.hp = 2;
  spawn(g, 'moon', PLAYER_X, 10);
  spawn(g, 'bone', PLAYER_X, 10);
  spawn(g, 'fog', PLAYER_X, 10); // a third at once must not push HP below 0
  const later = spawn(g, 'ash', 300, 10);
  update(g, 0.1);
  assert.equal(g.hp, 0);
  assert.equal(g.over, true);
  assert.equal(g.cleared, false);
  update(g, 1);
  assert.equal(later.x, 299);
  assert.equal(typeKey(g, 'a'), 'none');
});

test('a wave starts after a quiet break; a zombie walks in from off the right edge and is a target once its word is on screen', () => {
  const g = newGame();
  update(g, 1, () => 0);
  assert.equal(g.wave, 1);
  update(g, WAVE_BREAK - 0.1, () => 0);
  assert.equal(g.zombies.length, 0);
  update(g, 0.2, () => 0);
  assert.equal(g.zombies.length, 1);
  const z = g.zombies[0];
  assert.equal(z.word, WORDS.short[0]);
  assert.ok(z.x > FIELD_W);
  assert.equal(target(g), undefined); // its word cannot be read yet
  assert.equal(typeKey(g, z.word[0]), 'none'); // so a key does not shoot it
  for (let i = 0; i < 100 && !readable(z); i++) update(g, 0.05, () => 0);
  assert.equal(target(g), z);
});

test('two zombies on the field never carry the same word', () => {
  const g = newGame();
  const same = () => 0; // every pick would be the first short word
  update(g, 1, same);
  update(g, WAVE_BREAK, same);
  update(g, difficulty(1).interval, same);
  assert.deepEqual(g.zombies.map((z) => z.word), [WORDS.short[0], WORDS.short[1]]);
  g.zombies[0].diedAt = g.time; // a falling zombie no longer holds its word
  g.zombies[1].diedAt = g.time;
  update(g, difficulty(1).interval, same);
  assert.equal(g.zombies.at(-1)?.word, WORDS.short[0]);
});

test('a zombie can be shot once its whole word label is on screen, not before', () => {
  const g = quiet();
  const z = spawn(g, 'midnight', 609.5, 0); // 8 letters x 7 px: the label would end at 609.5 + 28 + 3 = 640.5
  assert.equal(target(g), undefined);
  z.x = 609; // now it ends at 640, the right edge
  assert.equal(target(g), z);
});

test('the next wave comes after the field is empty and its own break', () => {
  const g = newGame();
  playUntil(g, () => g.wave === 2);
  assert.equal(g.zombies.length, 0);
  update(g, WAVE_BREAK - 0.1);
  assert.equal(g.zombies.length, 0);
  update(g, 0.2);
  assert.equal(g.zombies.length, 1);
});

test('a mission is 3 waves of 8 to 12 zombies, then a boss; beating it completes the mission', () => {
  for (const [r, perWave] of [[0, 8], [0.99, 12]] as const) {
    const g = newGame();
    const sizes: number[] = []; // each wave's size, read as it begins
    playUntil(g, () => {
      if (sizes.length < g.wave) sizes.push(g.toSpawn);
      return g.over;
    }, () => r);
    assert.deepEqual(sizes, [perWave, perWave, perWave, 1]); // the boss's wave is the boss (its walkers come on their own)
    assert.equal(g.cleared, true);
    assert.equal(g.bosses, 1);
    assert.ok(g.kills > WAVES * perWave);
    assert.equal(g.hp, MAX_HP);
  }
});

test('a boss that reaches the barricade costs 3 HP and staggers back; each part of its line pushes it back; the last kills it', () => {
  const g = newGame();
  Object.assign(g, { wave: WAVES + 1, boss: true, toSpawn: 0 });
  const boss = spawn(g, [english('keep'), english('fire')], PLAYER_X + 1, 10, 'boss');
  update(g, 0.5);
  assert.equal(g.hp, MAX_HP - KINDS.boss.damage);
  assert.equal(boss.x, PLAYER_X + 1 - 5 + BOSS_BOUNCE);
  assert.ok(g.zombies.includes(boss));
  const x = boss.x;
  assert.deepEqual([...'keep'].map((ch) => typeKey(g, ch)), ['hit', 'hit', 'hit', 'part']);
  assert.equal(boss.x, x + BOSS_PUSH);
  assert.equal(g.lockedId, null); // a finished part frees the lock: a walker ahead of it could be next
  assert.deepEqual([...'fire'].map((ch) => typeKey(g, ch)), ['hit', 'hit', 'hit', 'kill']);
  assert.equal(g.bosses, 1);
  update(g, FALL_TIME);
  update(g, 0.1);
  assert.equal(g.over, true);
  assert.equal(g.cleared, true);
  const h = newGame(); // with 3 HP left, the boss reaching the barricade ends it
  Object.assign(h, { wave: WAVES + 1, boss: true, toSpawn: 0, hp: 3 });
  spawn(h, [english('keep')], PLAYER_X + 1, 10, 'boss');
  update(h, 0.5);
  assert.equal(h.over, true);
  assert.equal(h.cleared, false);
});

test('beating the boss fells the walkers it called: the mission is won even if one was about to reach the barricade', () => {
  const g = newGame();
  Object.assign(g, { wave: WAVES + 1, boss: true, toSpawn: 0, hp: 1 });
  const boss = spawn(g, [english('keep')], 300, 0, 'boss');
  const walker = spawn(g, 'moon', PLAYER_X + 5, 30); // a called walker, nearly at the barricade
  g.lockedId = boss.id; // the player was already on the boss's line
  typeWord(g, 'keep');
  assert.notEqual(walker.diedAt, null);
  assert.equal(g.kills, 1); // only the boss counts
  update(g, 0.5);
  update(g, FALL_TIME);
  update(g, 0.1);
  assert.equal(g.hp, 1);
  assert.equal(g.over, true);
  assert.equal(g.cleared, true);
});

test('a part of the line pushes the boss back, never forward, even right after it walked in', () => {
  const g = quiet();
  const boss = spawn(g, [english('keep'), english('fire')], FIELD_W - 30, 0, 'boss');
  typeWord(g, 'keep');
  assert.ok(boss.x >= FIELD_W - 30);
});

test('a runner walks 1.6 times and a brute 0.6 times the speed of its level', () => {
  for (const [kind, r] of [['runner', 0], ['brute', 0.99]] as const) {
    const g = newGame('mission', 5); // level 13: runners and brutes come
    const d = difficulty(13);
    // every rand is r, except the one that picks the kind (the 2nd: the 1st sizes the wave): just under the runner share,
    // or between the shares for a brute
    let calls = 0;
    const rand = () => (++calls === 2 ? (kind === 'runner' ? d.runner / 2 : d.runner + d.brute / 2) : r);
    update(g, 1, rand);
    update(g, WAVE_BREAK, rand);
    const z = g.zombies[0];
    assert.equal(z.kind, kind);
    assert.ok(Math.abs(z.speed - d.speed * KINDS[kind].speed * (0.8 + r * 0.4)) < 1e-9, `${kind} ${z.speed}`);
  }
});

test('a walker never carries a word that a boss on the field carries', () => {
  const g = newGame();
  update(g, 1, () => 0); // the wave begins (on an empty field)
  spawn(g, [english(WORDS.short[0]), english('fire')], 300, 0, 'boss'); // a line with the pool's first word
  update(g, WAVE_BREAK, () => 0); // the first walker would be WORDS.short[0]
  assert.equal(g.zombies.at(-1)?.word, WORDS.short[1]);
});

test('a brute carries two words and costs 2 HP; a runner is faster', () => {
  const g = quiet();
  const brute = spawn(g, [english('moon'), english('fire')], 200, 0, 'brute');
  assert.deepEqual([...'moon'].map((ch) => typeKey(g, ch)), ['hit', 'hit', 'hit', 'part']);
  assert.equal(brute.word, 'fire');
  assert.equal(brute.diedAt, null);
  assert.equal(typeWord(g, 'fire').at(-1), 'kill');
  const h = quiet();
  spawn(h, [english('moon'), english('fire')], PLAYER_X + 1, 10, 'brute');
  update(h, 0.5);
  assert.equal(h.hp, MAX_HP - 2);
  assert.ok(KINDS.runner.speed > KINDS.walker.speed && KINDS.brute.speed < KINDS.walker.speed);
});

test('the endless night has a boss on every 5th wave, and none on the others', () => {
  const g = newGame('endless');
  const bossWaves: number[] = [];
  playUntil(g, () => {
    if (g.boss && !bossWaves.includes(g.wave)) bossWaves.push(g.wave);
    return g.wave === 2 * BOSS_EVERY + 1;
  });
  assert.deepEqual(bossWaves, [BOSS_EVERY, 2 * BOSS_EVERY]);
  assert.equal(g.bosses, 2);
  assert.equal(g.over, false);
});

test('each wave is harder than the one before, in a mission and in the endless night', () => {
  for (const mode of ['mission', 'endless'] as const) {
    const g = newGame(mode);
    playUntil(g, () => g.zombies.length > 0); // the first zombie of wave 1
    const first = g.zombies[0].speed;
    playUntil(g, () => g.wave === 2 && g.zombies.some((z) => z.diedAt === null));
    assert.ok(g.zombies[0].speed > first, mode); // same rand, so only the level differs
  }
});

test('the endless night climbs two mission waves at a time: its wave 2 is as hard as wave 3 of mission 1', () => {
  const firstOf = (mode: 'mission' | 'endless', wave: number) => {
    const g = newGame(mode);
    playUntil(g, () => g.wave === wave && g.zombies.some((z) => z.diedAt === null));
    return g.zombies.find((z) => z.diedAt === null)!.speed; // the same rand, so the same share of its level's speed
  };
  assert.equal(firstOf('endless', 2), firstOf('mission', 3));
  assert.ok(firstOf('endless', 2) > firstOf('mission', 2));
  for (const wave of [1, 2, 3, 4]) assert.equal(firstOf('endless', wave), difficulty(2 * wave - 1).speed, `wave ${wave}`); // rand 0.5: x1.0 of the level's speed
});

test('the endless night goes on past wave 3', () => {
  const g = newGame('endless');
  playUntil(g, () => g.wave === WAVES + 1);
  assert.equal(g.wave, WAVES + 1);
  assert.equal(g.over, false);
});

test('later waves come faster, walk faster and use longer words; long words from mission 2', () => {
  for (let level = 1; level < 30; level++) {
    const [a, b] = [difficulty(level), difficulty(level + 1)];
    assert.ok(b.interval <= a.interval && b.speed >= a.speed && b.short <= a.short && b.long >= a.long, `level ${level}`);
  }
  const [l1, l4] = [difficulty(1), difficulty(4)];
  assert.ok(l4.interval < l1.interval && l4.speed > l1.speed && l4.short < l1.short && l4.long > l1.long);
  assert.equal(difficulty(3).long, 0); // none in mission 1
  const first = (mission: number, r = 0.99) => {
    const g = newGame('mission', mission);
    update(g, 1, () => r);
    update(g, WAVE_BREAK, () => r);
    return g.zombies[0];
  };
  assert.ok(WORDS.medium.includes(first(1).word));
  assert.ok(WORDS.long.includes(first(2).word));
  // walkers of words short enough to walk at their level's speed (a long word walks slower, see WALK_SLACK)
  assert.ok(first(2, 0.5).speed > first(1, 0.5).speed);
});

test('30 shots empty the magazine; for 2 seconds keys do nothing, then it is full again', () => {
  const g = quiet();
  const z = spawn(g, 'moon', 300, 0);
  update(g, 10); // not at time 0: the 2 seconds count from the empty magazine
  for (let i = 0; i < MAGAZINE; i++) assert.equal(typeKey(g, 'x'), 'miss');
  assert.equal(g.ammo, 0);
  assert.equal(typeKey(g, 'm'), 'none'); // reloading: no shot, not a miss
  assert.equal(z.typed, 0);
  assert.equal(g.misses, MAGAZINE);
  update(g, RELOAD_TIME - 0.1);
  assert.equal(typeKey(g, 'm'), 'none');
  update(g, 0.2);
  assert.equal(g.ammo, MAGAZINE);
  assert.equal(typeKey(g, 'm'), 'hit');
  assert.equal(g.ammo, MAGAZINE - 1);
});

test('a kill scores 100 x (1 + 0.1 per 10 combo); a miss resets the combo', () => {
  const g = quiet();
  spawn(g, 'abandoned', 200, 0);
  spawn(g, 'fog', 300, 0);
  spawn(g, 'ash', 400, 0);
  typeWord(g, 'abandoned'); // combo 9: x1.0
  assert.equal(g.score, 100);
  typeWord(g, 'fog'); // combo 12: x1.1
  assert.equal(g.score, 210);
  assert.equal(typeKey(g, 'x'), 'miss');
  assert.equal(g.combo, 0);
  typeWord(g, 'ash'); // combo 3: x1.0
  assert.equal(g.score, 310);
  assert.equal(g.maxCombo, 12);
  const h = quiet();
  spawn(h, 'shadow', 200, 0);
  spawn(h, 'bone', 300, 0);
  typeWord(h, 'shadowbone'); // the killing key of bone is the 10th in a row: x1.1
  assert.equal(h.score, 100 + 110);
});

test('accuracy is correct keys / all keys; WPM is 5 letters a word over the time there was a zombie', () => {
  const g = quiet();
  spawn(g, 'shadow', 300, 0);
  spawn(g, 'moon', 400, 0);
  update(g, 6); // 6 s with zombies on the field
  typeWord(g, 'shadow');
  typeKey(g, 'x');
  typeWord(g, 'moon'); // 10 correct, 1 wrong
  assert.equal(accuracy(g), 90.9); // percent, rounded down
  update(g, 30); // nothing left to shoot: the WPM clock stands still
  assert.equal(wpm(g), 20); // 2 words in 0.1 minutes
  assert.equal(accuracy(Object.assign(newGame(), { hits: 113, misses: 6 })), 94.9); // 94.96: not shown as the 95.0 an A needs
});

test('the WPM clock runs only while there is a readable zombie and rounds to shoot it', () => {
  const g = quiet();
  // its body on screen, its word not all yet: walking in at BASE_SPEED, it cannot be read for these 0.8 s
  const z = spawn(g, 'midnight', FIELD_W - 1, 0);
  for (let i = 0; i < 16; i++) update(g, 0.05);
  assert.ok(g.typingTime === 0 && !readable(z) && z.x < FIELD_W, `${g.typingTime} ${z.x}`);
  z.x = 300;
  update(g, 1);
  assert.equal(g.typingTime, 1);
  Object.assign(g, { ammo: 0, reloadUntil: g.time + RELOAD_TIME });
  update(g, 1); // reloading: nothing can be shot
  assert.equal(g.typingTime, 1);
});

test('grade: C failed, B cleared, A 95% accuracy, S 98% and no damage, with what the next one needs', () => {
  const done = (hits: number, misses: number, hp = MAX_HP) => Object.assign(newGame(), { over: true, cleared: true, hits, misses, hp });
  assert.deepEqual(grade(newGame()), { grade: 'C', next: 'ボスまで倒せば B' });
  assert.deepEqual(grade(done(380, 21)), { grade: 'B', next: 'A まで: 打ち間違いをあと 1 回減らす' });
  assert.deepEqual(grade(done(380, 20)), { grade: 'A', next: 'S まで: 打ち間違いをあと 13 回減らす' }); // exactly 95%
  assert.deepEqual(grade(done(113, 6)), { grade: 'B', next: 'A まで: 打ち間違いをあと 1 回減らす' }); // 94.96%: just short, shown as 94.9
  assert.deepEqual(grade(done(490, 10, MAX_HP - 1)), { grade: 'A', next: 'S まで: 被弾を 0 に（今回 1）' });
  assert.deepEqual(grade(done(490, 10, 8)), { grade: 'A', next: 'S まで: 被弾を 0 に（今回 2）' });
  assert.deepEqual(grade(done(490, 12, 9)), { grade: 'A', next: 'S まで: 打ち間違いをあと 2 回減らす・被弾を 0 に（今回 1）' });
  assert.deepEqual(grade(done(490, 10)), { grade: 'S', next: '' }); // exactly 98%
});

/** mulberry32: the same runs every time */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A simulated typist, from the typing research: a key every 12 / WPM s (log-normal, sigma 0.3), a share of wrong keys,
 * 0.6 s more to read each new word, 1.5 gaps for the key after a mistake. Returns how often it clears the mission.
 */
function clearRate(mission: number, wpm: number, acc: number, lang: 'en' | 'ja' = 'en', runs = 40) {
  let cleared = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const rand = seeded(seed);
    const hand = seeded(seed * 7919);
    const gap = () => (12 / wpm) * Math.exp(0.3 * Math.sqrt(-2 * Math.log(1 - hand())) * Math.cos(2 * Math.PI * hand()) - 0.045);
    const g = newGame('mission', mission, lang);
    let next = 0;
    let reading = '';
    while (!g.over) {
      update(g, 1 / 60, rand);
      if (g.ammo === 0) next = Math.max(next, g.reloadUntil);
      const t = target(g);
      if (t && `${t.id}.${t.part}` !== reading) {
        reading = `${t.id}.${t.part}`; // a new word (a brute's or a boss's next one too) is read first
        next = Math.max(next, g.time) + 0.6;
      }
      for (let z = t; z && `${z.id}.${z.part}` === reading && g.ammo > 0 && g.time >= next; z = target(g)) {
        const right = hand() < acc;
        typeKey(g, right ? guide(z).rest[0] : '#');
        next += gap() * (right ? 1 : 1.5);
      }
      if (!target(g)) next = Math.max(next, g.time);
    }
    if (g.cleared) cleared++;
  }
  return cleared / runs;
}

test('balance: a typist at a mission\'s target speed mostly clears it, one at 70% of that speed seldom does', () => {
  // target speeds and accuracy for missions 1, 3, 5 and 8 from the typing research; Japanese romaji 1.2 times as fast
  for (const [lang, pace] of [['en', 1], ['ja', 1.2]] as const) {
    for (const [mission, wpm, acc] of [[1, 12, 0.85], [3, 20, 0.88], [5, 30, 0.9], [8, 45, 0.93]]) {
      const at = clearRate(mission, wpm * pace, acc, lang);
      const slow = clearRate(mission, wpm * pace * 0.7, acc, lang);
      assert.ok(at >= 0.5, `${lang} mission ${mission} at ${wpm * pace} WPM cleared ${at * 100}%`);
      assert.ok(slow <= 0.2, `${lang} mission ${mission} at ${wpm * pace * 0.7} WPM cleared ${slow * 100}%`);
    }
  }
});

test('romaji: each kana takes the IME spellings, the guide the shortest; small kana, っ and ん join the kana around them', () => {
  assert.deepEqual(romajiUnits('し'), [['si', 'shi', 'ci']]);
  assert.deepEqual(romajiUnits('ふじ'), [['fu', 'hu'], ['ji', 'zi']]);
  assert.deepEqual(romajiUnits('しゃ'), [['sya', 'sha']]); // ゃゅょ only as one sound: si for しゃ is a miss at once
  assert.ok(['she', 'sye', 'sile', 'shixe'].every((s) => romajiUnits('しぇ')[0].includes(s))); // ぇ and loanword sounds also in two
  const tta = romajiUnits('った')[0]; // a doubled consonant, or a small つ on its own (ltu first)
  assert.equal(tta[0], 'tta');
  assert.ok(['ltuta', 'xtuta', 'ltsuta'].every((s) => tta.includes(s)));
  assert.ok(['tti', 'cchi', 'tchi'].every((s) => romajiUnits('っち')[0].includes(s)));
  assert.equal(romajiUnits('んか')[0][0], 'nka'); // a single n before a key that cannot follow n in another kana
  assert.ok(!romajiUnits('んな')[0].includes('nna') && romajiUnits('んな')[0].includes('nnna'));
  assert.ok(!romajiUnits('んい')[0].some((s) => s === 'ni' || s === 'nyi'));
  assert.ok(!romajiUnits('んー')[0].includes('n-'));
  assert.deepEqual(romajiUnits('ん'), [['nn', 'xn', "n'"]]); // at the end, a single n would not be a finished ん
  assert.deepEqual(romajiUnits('ー'), [['-']]);
  assert.deepEqual(romajiUnits('カメラ'), romajiUnits('かめら'));
  assert.throws(() => romajiUnits('ゐ'));
});

/** Types `keys` at a zombie carrying `reading`: true if every key hits and the last one kills it. */
function types(reading: string, keys: string) {
  const g = quiet();
  const z = spawn(g, [japanese(reading, reading)], 200, 0);
  const results = [...keys].map((ch) => typeKey(g, ch));
  return !results.includes('miss') && results.at(-1) === 'kill' && z.diedAt !== null;
}

test('romaji: the spellings Japanese typists use are taken, the ones an IME would not take are misses', () => {
  // examples from the romaji research (each as an IME would read them)
  const ok: [string, string][] = [
    ['こんにちは', 'konnnitiha'], ['こんにちは', 'konnnichiha'], ['こんにちは', "kon'nitiha"], ['こんにちは', 'koxnnitiha'],
    ['みんな', 'minnna'], ['きんよう', 'kinnyou'], ['たんい', 'tanni'], ['たんい', "tan'i"], ['たんい', 'taxni'],
    ['みかん', 'mikann'], ['みかん', 'mikaxn'], ['かんじ', 'kanji'], ['かんじ', 'kanzi'], ['かんじ', 'kannji'],
    ['でんわ', 'denwa'], ['でんわ', 'dennwa'], ['きって', 'kitte'], ['きって', 'kiltute'], ['きって', 'kixtsute'],
    ['まっちゃ', 'mattya'], ['まっちゃ', 'maccha'], ['まっちゃ', 'matcha'], ['まっちゃ', 'maltutya'], ['あっ', 'altu'], ['あっ', 'axtu'],
    ['しゃしん', 'syasinn'], ['しゃしん', 'shashinn'], ['ぱーてぃー', 'pa-thi-'], ['ぱーてぃー', 'pa-texi-'],
    ['うぉーたー', 'who-ta-'], ['うぉーたー', 'ulo-ta-'], ['ちぢむ', 'tidimu'], ['ちぢむ', 'chidimu'], ['を', 'wo'],
  ];
  for (const [reading, keys] of ok) assert.ok(types(reading, keys), `${reading}: ${keys}`);
  const no: [string, string][] = [
    ['こんにちは', 'konnitiha'], ['みんな', 'minna'], ['きんよう', 'kinyou'], ['たんい', 'tani'], ['みかん', 'mikan'],
    ['しゃしん', 'silyasinn'], ['うぉーたー', 'wo-ta-'], ['ちぢむ', 'tijimu'], ['を', 'o'],
  ];
  for (const [reading, keys] of no) assert.ok(!types(reading, keys), `${reading}: ${keys}`);
});

test('a Japanese word takes any of its romaji; the guide follows the spelling begun, and then the way the player types', () => {
  const g = quiet();
  const z = spawn(g, [japanese('廃墟', 'はいきょ')], 200, 0);
  assert.equal(guide(z).rest, 'haikyo');
  typeWord(g, 'hai');
  assert.equal(typeKey(g, 'x'), 'miss'); // no spelling of きょ starts with x
  assert.deepEqual(typeWord(g, 'kyo'), ['hit', 'hit', 'kill']);
  const h = quiet();
  const s = spawn(h, [japanese('写真', 'しゃしん')], 200, 0);
  assert.equal(labelWidth(s), Math.max(2 * 12, 'syasinn'.length * 7)); // the kanji line or the romaji line, whichever is longer
  typeWord(h, 'sh');
  assert.equal(guide(s, h.spell).rest, 'asinn');
  assert.deepEqual(typeWord(h, 'ashi'), ['hit', 'hit', 'hit', 'hit']);
  assert.equal(guide(s, h.spell).rest, 'nn');
  assert.equal(typeWord(h, 'nn').at(-1), 'kill');
  // the player typed sha and shi: from now on the guide shows them that way, after っ and ん too
  const next = spawn(h, [japanese('牛', 'しし')], 300, 0);
  assert.equal(guide(next, h.spell).rest, 'shishi');
  assert.equal(guide(next).rest, 'sisi');
  assert.equal(guide(spawn(h, [japanese('物資', 'ぶっし')], 400, 0), h.spell).rest, 'busshi');
  assert.equal(guide(spawn(h, [japanese('感謝', 'かんしゃ')], 500, 0), h.spell).rest, 'kansha');
  h.spell.ti = 'chi';
  assert.equal(guide(spawn(h, [japanese('マッチ', 'まっち')], 550, 0), h.spell).rest, 'macchi');
});

test('a Japanese word can be shot once its romaji, as the player spells it, is on screen', () => {
  const g = quiet();
  g.spell = { ti: 'chi', si: 'shi', tu: 'tsu' };
  const z = spawn(g, [japanese('地下室', 'ちかしつ')], 609, 0); // 'tikasitu' would fit, 'chikashitsu' is 3 letters wider
  assert.equal(target(g), undefined);
  z.x = FIELD_W - 'chikashitsu'.length * 3.5 - 3;
  assert.equal(target(g), z);
});

/** Every prompt of the game: each category's words and boss lines in both languages, and the passages. */
const everyPrompt = () =>
  (['en', 'ja'] as const).flatMap((lang) => [
    ...CATEGORIES.flatMap((c) => [...Object.values(pools(lang, c)).flat(), ...lines(lang, c).flat()]),
    ...passages(lang).flatMap((p) => p.parts),
  ]);

test('in every word, boss line and passage, no spelling of a unit is the start of another one of it', () => {
  // typeKey ends a unit at the first whole spelling, so a longer one starting with it could never be typed
  for (const p of everyPrompt()) {
    for (const unit of p.units) for (const a of unit) for (const b of unit) assert.ok(a === b || !b.startsWith(a), `${p.show}: ${a} / ${b}`);
  }
});

test('the score attack keeps the field busy and ends 60 s after its start, as finished', () => {
  const g = newGame('attack');
  update(g, 0.1);
  update(g, WAVE_BREAK);
  update(g, 1);
  update(g, 1);
  assert.equal(g.zombies.filter((z) => z.diedAt === null).length, 2); // a zombie every 0.8 s while there are fewer than 2
  playUntil(g, () => g.over);
  assert.equal(g.cleared, true);
  assert.ok(g.time >= 0.1 + WAVE_BREAK + ATTACK_TIME && g.time < 0.1 + WAVE_BREAK + ATTACK_TIME + 0.1, `${g.time}`);
  assert.ok(g.kills > 20, `${g.kills}`);
});

test('the practice costs no HP, ends after its words, and favours keys missed before', () => {
  const g = newGame('practice');
  for (let i = 0; i < 40_000 && !g.over; i++) update(g, 0.05); // nobody types: they walk to the barricade and go
  assert.equal(g.hp, MAX_HP);
  assert.equal(g.cleared, true);
  assert.equal(g.spawned, PRACTICE_WORDS);
  const wordsWithQ = (history: Game['history']) => {
    const h = newGame('practice', 1, 'en', history);
    const rand = seeded(5);
    const words = new Map<number, string>();
    for (let i = 0; i < 40_000 && !h.over; i++) {
      update(h, 0.05, rand);
      for (const z of h.zombies) words.set(z.id, z.word);
    }
    return [...words.values()].filter((w) => w.includes('q')).length;
  };
  // a player who types most keys well but misses q a lot
  const history: Game['history'] = { q: { tries: 20, misses: 15 } };
  for (const ch of 'abcdefghijklmnoprstuvwxyz') history[ch] = { tries: 20, misses: 1 };
  assert.ok(wordsWithQ(history) > wordsWithQ({}) + 2);
});

test('weak keys: the most missed first, only keys tried at least 5 times; a word\'s first key is not counted', () => {
  const stats = { a: { tries: 10, misses: 1 }, q: { tries: 6, misses: 3 }, z: { tries: 4, misses: 4 }, e: { tries: 9, misses: 0 } };
  assert.deepEqual(weakKeys(stats).map((k) => k.key), ['q', 'a']);
  const g = quiet();
  spawn(g, 'moon', 200, 0);
  typeKey(g, 'x'); // the first key of a word: it also carries the reading, so it is not counted
  typeKey(g, 'm');
  typeKey(g, 'x'); // a miss counts against the key that was due
  typeKey(g, 'o');
  assert.deepEqual(g.keyStats, { o: { tries: 2, misses: 1 } });
});

test('a boss can be shot once its body is on screen, however wide its line', () => {
  const g = quiet();
  const boss = spawn(g, lines('en')[0], FIELD_W - 20, 0, 'boss');
  assert.equal(target(g), undefined);
  boss.x = FIELD_W - 24;
  assert.equal(target(g), boss);
});

test('word list: lowercase a-z only, each group within its length range (12 letters at most), no duplicates', () => {
  const ranges = { short: [3, 5], medium: [6, 8], long: [9, 12] } as const;
  const all = Object.values(WORDS).flat();
  assert.equal(new Set(all).size, all.length);
  for (const [group, [min, max]] of Object.entries(ranges)) {
    for (const w of WORDS[group as keyof typeof WORDS]) {
      assert.match(w, /^[a-z]+$/, w);
      assert.ok(w.length >= min && w.length <= max, `${group}: ${w}`);
    }
  }
});

test('a part of a Japanese line or passage never ends in っ, nor in ん where the sentence would take a single n', () => {
  // each part is typed as a word of its own: a part ending in ん needs nn (xn, n'), which the sentence typed as one needs
  // only before a vowel, y, n or ー (the next part's first kana spelled so in every way); one ending in っ cannot double
  const texts = [...CATEGORIES.flatMap((c) => lines('ja', c)), ...passages('ja').map((p) => p.parts)];
  for (const parts of texts) {
    parts.slice(0, -1).forEach((p, i) => {
      const last = p.units.at(-1)!;
      assert.ok(!last.includes('ltu'), `${p.show} / ${parts[i + 1].show}`);
      if (last.includes('nn')) assert.ok(parts[i + 1].units[0].every((s) => /^[aiueoyn-]/.test(s)), `${p.show} / ${parts[i + 1].show}`);
    });
  }
});

test('Space shoots only where the text has a space next; elsewhere it is let off, costing no round and no miss', () => {
  const g = quiet();
  spawn(g, [english('no pain')], 300, 0);
  assert.equal(typeKey(g, ' '), 'none');
  assert.deepEqual(typeWord(g, 'no'), ['hit', 'hit']);
  assert.equal(typeKey(g, 'p'), 'miss'); // the space is due: another key misses
  assert.equal(typeKey(g, ' '), 'hit');
  assert.equal(typeKey(g, ' '), 'none');
  assert.deepEqual(typeWord(g, 'pain'), ['hit', 'hit', 'hit', 'kill']);
  assert.equal(g.ammo, MAGAZINE - 8);
  assert.equal(g.misses, 1);
});

test('romaji: the marks of a sentence are typed as the IMEs take them; a single n before a mark is ん', () => {
  for (const [reading, keys] of [['ほん、', 'hon,'], ['ほん、', 'honn,'], ['あっ！', 'altu!'], ['「はい」。', '[hai].'], ['え？', 'e?'], ['あ・い〜', 'a/i~']]) {
    assert.ok(types(reading, keys), `${reading}: ${keys}`);
  }
  assert.ok(!types('ほん。', 'ho.'));
});

test('every category has words in each group and boss lines in both languages; digits and code play as the English game', () => {
  for (const c of CATEGORIES) {
    for (const lang of ['en', 'ja'] as const) {
      for (const group of Object.values(pools(lang, c))) assert.ok(group.length > 0, `${c} ${lang}`);
      assert.ok(lines(lang, c).length > 0, `${c} ${lang} lines`);
    }
  }
  assert.equal(newGame('mission', 1, 'ja', {}, {}, 'symbols').lang, 'en');
  assert.equal(newGame('mission', 1, 'ja', {}, {}, 'places').lang, 'ja');
  assert.equal(newGame('passage', 1, 'ja', {}, {}, 'symbols').lang, 'ja'); // the passage's text is not the category's
  // the keys of what is typed as written can be typed: lowercase (the keys are taken in lowercase), no backslash (¥ on a
  // Japanese keyboard), and one space between words, none at either end
  for (const p of everyPrompt()) {
    for (const unit of p.units) for (const s of unit) assert.match(s, /^[ -[\]-~]+$/, p.show);
    assert.doesNotMatch(spelled(p), /[A-Z]|^ | $|  /, p.show);
  }
});

test('a long word walks slower: its walk leaves WALK_SLACK times the time its keys take at the speed of its level', () => {
  const g = newGame('mission', 1, 'en', {}, {}, 'classic');
  playUntil(g, () => g.zombies.length > 0, () => 0.99); // the fastest of its kind (jitter 1.2): the cap holds for it too
  const z = g.zombies[0];
  const d = difficulty(1, 'en', 'classic');
  const keys = z.prompts.reduce((n, p) => n + spelled(p).length, 0);
  assert.ok((FIELD_W - PLAYER_X) / z.speed >= ((WALK_SLACK * keys * 12) / d.wpm) * 0.999, `${z.word} ${z.speed}`);
  assert.ok(z.speed < d.speed * 0.8, `${z.word}: a saying is slower than the level's walkers`);
});

test('a zombie that cannot be shot yet walks in at BASE_SPEED at least; once it can, at its own speed', () => {
  const g = quiet();
  const z = spawn(g, [english('better late than never')], FIELD_W + 16, 5);
  update(g, 0.1);
  assert.ok(Math.abs(z.x - (FIELD_W + 16 - BASE_SPEED * 0.1)) < 1e-9, `${z.x}`);
  z.x = 300;
  update(g, 0.1);
  assert.ok(Math.abs(z.x - (300 - 5 * 0.1)) < 1e-9, `${z.x}`);
});

test('a wave of long words has fewer of them, each hurting as many times more at the barricade; they come further apart', () => {
  const sizes = (lang: 'en' | 'ja', c: 'night' | 'classic' | 'places') =>
    [0, 0.5, 0.99].map((r) => {
      const g = newGame('mission', 1, lang, {}, {}, c);
      update(g, 0.1, () => r);
      return g.toSpawn;
    });
  assert.deepEqual(sizes('en', 'night'), [8, 10, 12]);
  assert.deepEqual(sizes('ja', 'places'), [8, 10, 12]); // a little longer, not twice: as the night
  assert.deepEqual(sizes('en', 'classic'), [3, 3, 4]); // a third
  assert.deepEqual(sizes('ja', 'classic'), [4, 5, 6]); // a half
  // English proverbs are about 3 times as long as the night's words, Japanese sayings 2: a boss hurts as ever, and in the
  // score attack (its field keeps its number) every zombie as its kind does
  const hurtBy = (lang: 'en' | 'ja', c: 'night' | 'classic', kind: 'walker' | 'brute' | 'boss' = 'walker', mode: 'mission' | 'attack' = 'mission') => {
    const g = newGame(mode, 1, lang, {}, {}, c);
    Object.assign(g, { wave: 1, toSpawn: 1, nextSpawnAt: Infinity, waveStart: 0 });
    spawn(g, [english('ab')], PLAYER_X + 1, 10, kind);
    update(g, 0.5);
    assert.equal(MAX_HP - g.hp, hurtOf(g, kind));
    return MAX_HP - g.hp;
  };
  assert.deepEqual(
    [hurtBy('en', 'night'), hurtBy('en', 'classic'), hurtBy('ja', 'classic'), hurtBy('en', 'classic', 'brute'), hurtBy('en', 'classic', 'boss'), hurtBy('en', 'classic', 'walker', 'attack')],
    [1, 3, 2, 6, 3, 1],
  );
  // and they come further apart: the gap is the time the level's speed takes for the category's words
  assert.ok(difficulty(1, 'en', 'classic').interval > 2 * difficulty(1, 'en').interval);
});

test('the passage mode: one giant with a whole passage, walking at its pace; every key pushes it back; beating it wins', () => {
  const g = newGame('passage', 2, 'en');
  for (let i = 0; i < 1000 && g.zombies.length === 0; i++) update(g, 0.05, () => 0); // nobody types
  const giant = g.zombies[0];
  assert.equal(giant.kind, 'boss');
  assert.equal(g.passage, 0);
  assert.equal(giant.prompts, passages('en')[0].parts);
  assert.ok(readable(giant) && giant.x <= FIELD_W - 54); // on screen from the start, all of it (drawn 3 times as big)
  const d = difficulty(2 * WAVES, 'en'); // as hard as the last wave of the mission chosen (2)
  const keys = giant.prompts.reduce((n, p) => n + spelled(p).length, 0);
  // it walks GIANT_PACE px in the time the passage takes at the level's speed, reading each part
  assert.ok(Math.abs(giant.speed - GIANT_PACE / ((keys * 12) / d.wpm + giant.prompts.length * READ_TIME)) < 1e-9);
  for (let i = 0; i < 600; i++) {
    update(g, 0.05, () => 0);
    assert.equal(g.zombies.length, 1); // it calls no walkers
  }
  assert.equal(g.hp, MAX_HP);
  Object.assign(g, { ammo: MAGAZINE, lockedId: giant.id });
  giant.x = 100; // well away from the right edge, which no push goes past
  while (giant.part === 0) {
    const x = giant.x;
    assert.notEqual(typeKey(g, guide(giant).rest[0]), 'none');
    assert.ok(Math.abs(giant.x - x - GIANT_PACE / keys) < 1e-9, `${giant.x - x}`); // each key the same, a part's end no more
  }
  // a miss pushes nothing; while the rifle is reloaded the giant stands still, then walks on
  g.ammo = 1;
  const still = giant.x;
  assert.equal(typeKey(g, '#'), 'miss');
  assert.equal(giant.x, still);
  update(g, RELOAD_TIME - 0.1, () => 0);
  assert.equal(giant.x, still);
  update(g, 0.2, () => 0);
  assert.ok(giant.x < still);
  giant.x = FIELD_W - 60; // no push takes it past its spot at the right edge
  Object.assign(g, { ammo: MAGAZINE, lockedId: giant.id });
  while (giant.part === 1) assert.notEqual(typeKey(g, guide(giant).rest[0]), 'none');
  assert.equal(giant.x, FIELD_W - 54);
  // the last part: every key pushes it back as much as at the start (the passage's keys, not those left); the last beats it
  Object.assign(giant, { part: giant.prompts.length - 1, word: giant.prompts.at(-1)!.show, typed: 0, keys: '', done: '', x: 100 });
  Object.assign(g, { ammo: MAGAZINE, lockedId: giant.id });
  while (giant.diedAt === null) {
    const x = giant.x;
    assert.notEqual(typeKey(g, guide(giant).rest[0]), 'none');
    assert.ok(Math.abs(giant.x - x - GIANT_PACE / keys) < 1e-9, `${giant.x - x}`);
  }
  update(g, FALL_TIME + 0.1, () => 0);
  update(g, 0.1, () => 0);
  assert.equal(g.cleared, true);
  assert.equal(g.bosses, 1);
});

test('the passage mode in Japanese: every key pushes the giant back the same, a kana of two keys twice; the barricade costs 3 HP', () => {
  const g = newGame('passage', 1, 'ja');
  for (let i = 0; i < 1000 && g.zombies.length === 0; i++) update(g, 0.05, () => 0.5);
  const giant = g.zombies[0];
  const keys = giant.prompts.reduce((n, p) => n + spelled(p).length, 0);
  Object.assign(g, { ammo: MAGAZINE, lockedId: giant.id });
  giant.x = 100;
  assert.ok(spelled(giant.prompts[0]).length > giant.prompts[0].units.length); // a part of kana of one key and of more
  while (giant.part === 0) {
    const x = giant.x;
    assert.notEqual(typeKey(g, guide(giant).rest[0]), 'none');
    assert.ok(Math.abs(giant.x - x - GIANT_PACE / keys) < 1e-9, `${giant.x - x}`); // every key, not only a kana's last
  }
  giant.x = PLAYER_X + 1;
  for (const z of g.zombies) if (z !== giant) z.diedAt = g.time;
  update(g, 0.5, () => 0.5);
  assert.equal(g.hp, MAX_HP - KINDS.boss.damage);
  assert.ok(giant.x > PLAYER_X + BOSS_BOUNCE - 20);
});
