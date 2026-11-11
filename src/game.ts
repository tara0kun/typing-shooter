import { romajiUnits } from './romaji.ts';
import { BOSS_LINES_JA, WORDS_JA } from './words-ja.ts';
import { BOSS_LINES, WORDS } from './words.ts';

/** Game rules only: no DOM, no drawing, so it can be tested directly. Distances are field pixels, times are seconds. */
export const FIELD_W = 640;
export const PLAYER_X = 56; // a zombie whose x reaches this deals damage
export const MAX_HP = 10;
export const BASE_SPEED = 32; // px per second at level 1; each zombie gets 0.8x-1.2x of its level's speed
export const FALL_TIME = 0.8; // a killed zombie stays on screen this long: 0.3 s to fall over, then it lies and fades
export const WAVES = 3; // normal waves per mission; its boss comes after them
export const WAVE_BREAK = 3; // quiet time before each wave, while its banner shows
export const MAGAZINE = 30;
export const RELOAD_TIME = 2;
export const LETTER_W = 7; // px per letter of a word label (12 px monospace is about 6.6, so the label always fits)
export const KANA_W = 12; // px per full-width character of a label (Japanese text at 12 px)
export const ATTACK_TIME = 60; // the score attack's length
export const PRACTICE_WORDS = 30; // words in a practice run
export const BOSS_EVERY = 5; // the endless night has a boss on every 5th wave
export const BOSS_PUSH = 48; // each part of its line typed pushes the boss back this far
export const BOSS_BOUNCE = 200; // a boss that reaches the barricade hits it and staggers back this far
export const MINION_GAP = 3; // a walking boss calls a walker every this many of its level's gaps between zombies

export type Mode = 'mission' | 'endless' | 'attack' | 'practice';
export type Lang = 'en' | 'ja';
export type Kind = 'walker' | 'runner' | 'brute' | 'boss';

/** How each kind walks, hurts and scores: a runner carries a short word, a brute two words, a boss a whole line. */
export const KINDS: Record<Kind, { speed: number; damage: number; score: number }> = {
  walker: { speed: 1, damage: 1, score: 100 },
  runner: { speed: 1.6, damage: 1, score: 100 },
  brute: { speed: 0.6, damage: 2, score: 200 },
  boss: { speed: 0.4, damage: 3, score: 1000 },
};

/** A word to type: how it is written, and for each unit (a letter, or a kana chunk) every spelling that types it, the guide's first. */
export interface Prompt {
  show: string;
  units: string[][];
}

export const english = (word: string): Prompt => ({ show: word, units: [...word].map((ch) => [ch]) });
export const japanese = (text: string, reading: string): Prompt => ({ show: text, units: romajiUnits(reading) });

export interface Zombie {
  id: number;
  kind: Kind;
  prompts: Prompt[]; // one; two for a brute; the parts of its line for a boss
  part: number; // the prompt being typed
  word: string; // what the current prompt shows
  typed: number; // units of the current prompt done
  keys: string; // keys typed into the unit being typed (the start of one of its spellings)
  done: string; // the keys typed for the units done, as the player spelled them
  x: number;
  speed: number;
  diedAt: number | null; // game time of the kill, null while alive
}

export type KeyStats = Record<string, { tries: number; misses: number }>;
/** A unit's guide spelling (its first) to the spelling the player last typed it with. */
export type Spelling = Record<string, string>;

export interface Game {
  mode: Mode;
  lang: Lang;
  mission: number; // each mission is harder than the one before
  wave: number; // 1-based; in a mission the wave after the last normal one is the boss's
  boss: boolean; // this wave is a boss wave
  toSpawn: number; // zombies of this wave not on the field yet
  waveStart: number; // time the wave's first zombie comes, after the break
  nextSpawnAt: number;
  minionAt: number; // while a boss walks, when it calls the next walker
  spawned: number; // zombies so far (a practice run has PRACTICE_WORDS)
  time: number;
  hp: number;
  zombies: Zombie[];
  lockedId: number | null;
  nextId: number;
  ammo: number; // 0 while reloading
  reloadUntil: number;
  kills: number;
  bosses: number; // bosses beaten
  hits: number; // correct keys
  misses: number; // wrong keys
  combo: number; // correct keys in a row
  maxCombo: number;
  score: number;
  typingTime: number; // seconds with a living zombie to shoot at: the clock for WPM
  keyStats: KeyStats; // this game's tries and misses per key that was due
  history: KeyStats; // earlier games' (the practice picks words by both)
  spell: Spelling; // how the player has typed units the guide spells another way (shi for si): the guide follows it
  over: boolean;
  cleared: boolean; // won: the mission's boss beaten, the score attack's time used up, the practice run finished
}

export type KeyResult = 'hit' | 'part' | 'kill' | 'miss' | 'none';

export function newGame(mode: Mode = 'mission', mission = 1, lang: Lang = 'en', history: KeyStats = {}, spell: Spelling = {}): Game {
  return {
    mode, lang, mission, wave: 0, boss: false, toSpawn: 0, waveStart: 0, nextSpawnAt: 0, minionAt: Infinity, spawned: 0,
    time: 0, hp: MAX_HP, zombies: [], lockedId: null, nextId: 1, ammo: MAGAZINE, reloadUntil: 0, kills: 0, bosses: 0,
    hits: 0, misses: 0, combo: 0, maxCombo: 0, score: 0, typingTime: 0, keyStats: {}, history, spell, over: false, cleared: false,
  };
}

type Pool = Record<'short' | 'medium' | 'long', Prompt[]>;
const POOLS: Record<Lang, Pool> = {
  en: { short: WORDS.short.map(english), medium: WORDS.medium.map(english), long: WORDS.long.map(english) },
  ja: {
    short: WORDS_JA.short.map(([t, r]) => japanese(t, r)),
    medium: WORDS_JA.medium.map(([t, r]) => japanese(t, r)),
    long: WORDS_JA.long.map(([t, r]) => japanese(t, r)),
  },
};
const LINES: Record<Lang, Prompt[][]> = {
  en: BOSS_LINES.map((line) => line.map(english)),
  ja: BOSS_LINES_JA.map((line) => line.map(([t, r]) => japanese(t, r))),
};
export const pools = (lang: Lang) => POOLS[lang];
export const lines = (lang: Lang) => LINES[lang];

/** The guide's spelling of a prompt (the first spelling of each unit): the keys a Japanese label shows under the word. */
export const spelled = (p: Prompt) => p.units.map((u) => u[0]).join('');
const meanKeys = (ps: Prompt[]) => ps.reduce((n, p) => n + spelled(p).length, 0) / ps.length;
const MEAN = Object.fromEntries(
  (['en', 'ja'] as const).map((l) => [l, { short: meanKeys(POOLS[l].short), medium: meanKeys(POOLS[l].medium), long: meanKeys(POOLS[l].long) }]),
) as Record<Lang, Record<keyof Pool, number>>;
// how much faster than in English a level asks to type: Japanese players type Japanese romaji faster (missions 1/3/5/8 then
// ask 1.2/2.1/3.0/4.5 keys a second, between school targets and a typing site's average of about 3.5); 1.1 if children play
const PACE: Record<Lang, number> = { en: 1, ja: 1.2 };
const RUNNER_COST = 1.6; // fitted with the simulated typist, so that runners and brutes do not make a wave harder than its speed
const BRUTE_COST = 1.2;

/**
 * Level counts waves across missions (mission 2 starts at level 4). Each level asks for a typing speed: 9 WPM at the
 * first, 1.5 more each level, so the last wave of mission m asks about 7.5 + 4.5 m (12, 16.5, 21, ... 43.5 at mission 8,
 * the speeds the typing research gave for those missions). The gap between zombies is the time that speed needs for the
 * average keys of the level's mix (a brute carries two words); they also walk faster, and the words get longer.
 */
// shortcut: fitted to a simulated typist (gaps, misses and reading time from the research), not to real players; retune after people play
export function difficulty(level: number, lang: Lang = 'en') {
  const n = level - 1;
  const short = Math.max(0.15, 0.65 - 0.05 * n); // shares of short and long words, the rest are medium
  const long = Math.min(0.45, Math.max(0, 0.04 * (n - 2))); // long words from mission 2 on
  const runner = Math.min(0.2, Math.max(0, 0.03 * (n - 2))); // shares of runners (from level 4) and brutes (from level 7)
  const brute = Math.min(0.15, Math.max(0, 0.02 * (n - 5)));
  const m = MEAN[lang];
  const word = short * m.short + (1 - short - long) * m.medium + long * m.long;
  // a runner's short word counts as more, it leaves less time; a brute's two words as more, it hits twice as hard
  const keys = (1 - runner - brute) * word + runner * RUNNER_COST * m.short + brute * BRUTE_COST * 2 * m.medium;
  const wpm = Math.min(130, 9 + 1.5 * n) * PACE[lang];
  return { wpm, interval: (keys * 12) / wpm, speed: BASE_SPEED * Math.min(2, 1 + 0.03 * n), short, long, runner, brute };
}

/** The level of the wave being played: missions climb one a wave (the boss's wave is as hard as the last), the endless night two. */
export const level = (g: Game) => (g.mode === 'mission' ? (g.mission - 1) * WAVES + Math.min(g.wave, WAVES) : 2 * g.wave - 1);

/** x1.0, plus 0.1 for every 10 correct keys in a row. */
export const multiplier = (combo: number) => 1 + Math.floor(combo / 10) / 10;

export function spawn(g: Game, what: string | Prompt[], x: number, speed: number, kind: Kind = 'walker'): Zombie {
  const prompts = typeof what === 'string' ? [english(what)] : what;
  const z: Zombie = { id: g.nextId++, kind, prompts, part: 0, word: prompts[0].show, typed: 0, keys: '', done: '', x, speed, diedAt: null };
  g.zombies.push(z);
  g.spawned++;
  return z;
}

/** The label's first line: the word, or a boss's whole line. */
export function labelText(z: Zombie): string {
  if (z.kind !== 'boss') return z.word;
  const shows = z.prompts.map((p) => p.show);
  return shows.join(shows.every((s) => /^[ -~]*$/.test(s)) ? ' ' : '');
}
/** Width of a label line: half-width characters LETTER_W, full-width ones (kana, kanji) KANA_W. */
export const lineWidth = (s: string) => [...s].reduce((w, ch) => w + (ch >= ' ' && ch <= '~' ? LETTER_W : KANA_W), 0);
/** The label is as wide as its longer line: the word (or the boss's line), or the keys shown under a Japanese word. */
export function labelWidth(z: Zombie, spell: Spelling = {}) {
  const keys = guide(z, spell);
  return Math.max(lineWidth(labelText(z)), lineWidth(keys.done + keys.rest));
}

/**
 * The whole word label is on screen (as the player's own spellings draw it): a zombie walking in from the right edge
 * cannot be shot before that. A boss's line has a band of its own, so a boss can be shot once its body is on screen.
 */
export const readable = (z: Zombie, spell: Spelling = {}) =>
  z.kind === 'boss' ? z.x + 24 <= FIELD_W : z.x + labelWidth(z, spell) / 2 + 3 <= FIELD_W;

/** The locked zombie while one is locked, otherwise the leftmost living one once its word can be read. */
export function target(g: Game): Zombie | undefined {
  const alive = g.zombies.filter((z) => z.diedAt === null);
  const t = alive.find((z) => z.id === g.lockedId) ?? alive.reduce<Zombie | undefined>((a, z) => (a && a.x <= z.x ? a : z), undefined);
  return t && readable(t, g.spell) ? t : undefined;
}

/**
 * How the player would type a unit: the way they last typed it; for a unit joined to っ or ん (ssi, nsya) with no memory
 * of its own, the way they typed the kana inside it (shi gives sshi, sha gives nsha); else the guide's first spelling.
 */
function liked(unit: string[], spell: Spelling): string {
  const own = spell[unit[0]];
  if (own !== undefined && unit.includes(own)) return own;
  for (const [guideWay, theirWay] of Object.entries(spell)) {
    if (unit[0].length <= guideWay.length || !unit[0].endsWith(guideWay)) continue;
    const head = unit[0].slice(0, -guideWay.length); // the っ or ん in front: t of tti, n of nsya
    const way = head === guideWay[0] ? theirWay[0] + theirWay : head + theirWay; // っ doubles their first letter (cchi)
    if (unit.includes(way)) return way;
  }
  return unit[0];
}

/** A prompt's keys as the player would type it (the practice weighs words by these). */
export const spelledAs = (p: Prompt, spell: Spelling) => p.units.map((u) => liked(u, spell)).join('');

/**
 * The keys of the current prompt: those typed (as the player spelled them) and the rest: the spelling begun for the unit
 * being typed, and for the others the way the player types them (`spell`, see liked), else the guide's first spelling.
 */
export function guide(z: Zombie, spell: Spelling = {}): { done: string; rest: string } {
  const units = z.prompts[z.part].units;
  if (z.typed >= units.length) return { done: z.done, rest: '' };
  const unit = units[z.typed];
  const begun = [liked(unit, spell), ...unit].find((s) => s.startsWith(z.keys)) ?? unit[0];
  return { done: z.done + z.keys, rest: begun.slice(z.keys.length) + units.slice(z.typed + 1).map((u) => liked(u, spell)).join('') };
}

/** One key press = one shot at the target; a key that no spelling continues is a shot that misses. No target or reloading: no shot. */
export function typeKey(g: Game, ch: string): KeyResult {
  const t = g.over || g.ammo === 0 ? undefined : target(g);
  if (!t) return 'none';
  if (--g.ammo === 0) g.reloadUntil = g.time + RELOAD_TIME;
  const units = t.prompts[t.part].units;
  const keys = t.keys + ch;
  // a word's first key also carries the reading and the finding of it: it does not count for or against the key
  const first = t.typed === 0 && t.keys === '';
  if (!units[t.typed].some((s) => s.startsWith(keys))) {
    if (!first) count(g, guide(t, g.spell).rest[0], true);
    g.misses++;
    g.combo = 0;
    return 'miss';
  }
  if (!first) count(g, ch, false);
  g.hits++;
  g.maxCombo = Math.max(g.maxCombo, ++g.combo);
  g.lockedId = t.id;
  t.keys = keys;
  if (units[t.typed].includes(keys)) {
    // a whole spelling: the unit is done (no spelling of a unit is the start of another, the tests check that)
    if (units[t.typed].length > 1) g.spell[units[t.typed][0]] = keys; // the guide shows it this way from now on
    t.done += keys;
    t.keys = '';
    t.typed++;
  }
  if (t.typed < units.length) return 'hit';
  g.lockedId = null; // a finished word frees the lock, a brute's or a boss's too: whoever is leftmost is next
  if (t.part + 1 < t.prompts.length) {
    t.part++;
    t.word = t.prompts[t.part].show;
    t.typed = 0;
    t.done = '';
    if (t.kind === 'boss') t.x = Math.max(t.x, Math.min(FIELD_W - 40, t.x + BOSS_PUSH)); // back, never forward
    return 'part';
  }
  t.diedAt = g.time;
  g.kills++;
  g.score += Math.round(KINDS[t.kind].score * multiplier(g.combo));
  if (t.kind === 'boss') {
    g.bosses++;
    // the walkers it called fall with it (not counted as kills): beating the boss ends its wave
    for (const z of g.zombies) if (z.diedAt === null) z.diedAt = g.time;
  }
  return 'kill';
}

function count(g: Game, key: string | undefined, missed: boolean) {
  if (!key) return;
  const s = (g.keyStats[key] ??= { tries: 0, misses: 0 });
  s.tries++;
  if (missed) s.misses++;
}

/** The player's share of misses over all keys (0.1 before any): what a key with no record of its own is taken to have. */
export function missRate(...stats: KeyStats[]): number {
  let [tries, misses] = [0, 0];
  for (const s of stats.flatMap((st) => Object.values(st))) [tries, misses] = [tries + s.tries, misses + s.misses];
  return tries > 0 ? misses / tries : 0.1;
}

/** A key's share of misses, pulled toward the player's own rate while its tries are few (as if 4 more tries at that rate). */
const smoothed = (s: { tries: number; misses: number } | undefined, rate: number) => ((s?.misses ?? 0) + 4 * rate) / ((s?.tries ?? 0) + 4);

/** The keys missed most (at least 5 tries, so one slip in a few tries is not the top), most first. */
export function weakKeys(stats: KeyStats, n = 3) {
  const rate = missRate(stats);
  return Object.entries(stats)
    .filter(([, s]) => s.misses > 0 && s.tries >= 5)
    .map(([key, s]) => ({ key, ...s }))
    .sort((a, b) => smoothed(b, rate) - smoothed(a, rate) || b.misses - a.misses)
    .slice(0, n);
}

/** How much a key needs practice: its share of misses this game and earlier ones; a key with no record counts as average. */
export function weakness(g: Game, key: string, rate = missRate(g.keyStats, g.history)): number {
  const [a, b] = [g.keyStats[key], g.history[key]];
  return smoothed({ tries: (a?.tries ?? 0) + (b?.tries ?? 0), misses: (a?.misses ?? 0) + (b?.misses ?? 0) }, rate);
}

export function update(g: Game, dt: number, rand: () => number = Math.random): void {
  if (g.over) return;
  g.time += dt;
  if (g.ammo === 0 && g.time >= g.reloadUntil) g.ammo = MAGAZINE;
  if (g.mode === 'mission' || g.mode === 'endless') waves(g, rand);
  else busy(g, rand);
  if (g.over) return;
  if (g.ammo > 0 && target(g)) g.typingTime += dt; // the WPM clock: a word to read and rounds to shoot it
  for (const z of g.zombies) if (z.diedAt === null) z.x -= z.speed * dt;
  const reached = g.zombies.filter((z) => z.diedAt === null && z.x <= PLAYER_X);
  for (const z of reached) {
    if (g.mode !== 'practice') g.hp = Math.max(0, g.hp - KINDS[z.kind].damage);
    if (z.kind === 'boss') z.x += BOSS_BOUNCE; // it hits the barricade and staggers back, still carrying its line
    else if (z.id === g.lockedId) g.lockedId = null;
  }
  g.zombies = g.zombies.filter((z) => !(reached.includes(z) && z.kind !== 'boss') && (z.diedAt === null || g.time - z.diedAt < FALL_TIME));
  g.over = g.hp === 0;
}

/** Missions and the endless night: waves after a break; a boss after a mission's last wave and on every 5th endless one. */
function waves(g: Game, rand: () => number) {
  if (g.toSpawn === 0 && g.zombies.length === 0) {
    // the wave is over (or the game has just begun)
    if (g.mode === 'mission' && g.boss) {
      g.cleared = g.over = true;
      return;
    }
    g.wave++;
    g.boss = g.mode === 'mission' ? g.wave > WAVES : g.wave % BOSS_EVERY === 0;
    g.toSpawn = g.boss ? 1 : 8 + Math.floor(rand() * 5);
    g.waveStart = g.nextSpawnAt = g.time + WAVE_BREAK;
  }
  const d = difficulty(level(g), g.lang);
  if (g.toSpawn > 0 && g.time >= g.nextSpawnAt) {
    spawnKind(g, d, rand, g.boss ? 'boss' : pickKind(d, rand));
    g.toSpawn--;
    g.nextSpawnAt = g.time + d.interval;
    if (g.boss) g.minionAt = g.time + MINION_GAP * d.interval;
  }
  // a walking boss calls a walker now and then
  if (g.boss && g.time >= g.minionAt && g.zombies.some((z) => z.kind === 'boss' && z.diedAt === null)) {
    spawnKind(g, d, rand, 'walker');
    g.minionAt = g.time + MINION_GAP * d.interval;
  }
}

/** The score attack and the practice have no waves: after the start's break the field is kept busy, never empty for long. */
function busy(g: Game, rand: () => number) {
  if (g.wave === 0) {
    g.wave = 1;
    g.waveStart = g.nextSpawnAt = g.time + WAVE_BREAK;
  }
  const t = g.time - g.waveStart;
  if (g.mode === 'attack' && t >= ATTACK_TIME) {
    g.cleared = g.over = true;
    return;
  }
  if (g.mode === 'practice' && g.spawned >= PRACTICE_WORDS && g.zombies.length === 0) {
    g.cleared = g.over = true;
    return;
  }
  if (g.time < g.nextSpawnAt) return;
  const alive = g.zombies.filter((z) => z.diedAt === null).length;
  if (g.mode === 'attack') {
    // a level every 5 s (mission 1 at the start, mission 5 near the end), one more zombie on the field every 15 s
    const d = difficulty(1 + Math.floor(t / 5), g.lang);
    if (alive < 2 + Math.floor(t / 15)) spawnKind(g, d, rand, pickKind(d, rand));
  } else if (alive < 2 && g.spawned < PRACTICE_WORDS) {
    spawn(g, [practicePrompt(g, rand)], FIELD_W + 16, difficulty(1, g.lang).speed * 0.8);
  }
  g.nextSpawnAt = g.time + 0.8;
}

function pickKind(d: ReturnType<typeof difficulty>, rand: () => number): Kind {
  const r = rand();
  return r < d.runner ? 'runner' : r < d.runner + d.brute ? 'brute' : 'walker';
}

function spawnKind(g: Game, d: ReturnType<typeof difficulty>, rand: () => number, kind: Kind): Zombie {
  const pool = POOLS[g.lang];
  let prompts: Prompt[];
  if (kind === 'boss') prompts = LINES[g.lang][Math.floor(rand() * LINES[g.lang].length)];
  else if (kind === 'runner') prompts = [pick(g, pool.short, rand)];
  else if (kind === 'brute') {
    const first = pick(g, pool.medium, rand);
    prompts = [first, pick(g, pool.medium, rand, first)];
  } else {
    const r = rand();
    prompts = [pick(g, r < d.short ? pool.short : r < 1 - d.long ? pool.medium : pool.long, rand)];
  }
  return spawn(g, prompts, FIELD_W + (kind === 'boss' ? 40 : 16), d.speed * KINDS[kind].speed * (0.8 + rand() * 0.4), kind);
}

/**
 * A random word of the pool; one already walking on the field (a boss's line included) gives way to the next in the
 * list, so no two zombies share a word.
 */
function pick(g: Game, pool: Prompt[], rand: () => number, also?: Prompt): Prompt {
  let i = Math.floor(rand() * pool.length);
  const taken = (p: Prompt) =>
    p.show === also?.show || g.zombies.some((z) => z.diedAt === null && z.prompts.some((q) => q.show === p.show));
  for (let n = 0; n < pool.length && taken(pool[i]); n++) i = (i + 1) % pool.length;
  return pool[i];
}

/** The practice's next word: the weakest of 16 random ones, so weak keys come often and the words still vary. */
function practicePrompt(g: Game, rand: () => number): Prompt {
  const pool = [...POOLS[g.lang].short, ...POOLS[g.lang].medium];
  const rate = missRate(g.keyStats, g.history);
  let best = pool[0];
  let bestScore = -1;
  for (let i = 0; i < 16; i++) {
    const p = pick(g, pool, rand);
    const keys = spelledAs(p, g.spell); // the keys the player would press: their weak ones are those
    const score = [...keys].reduce((sum, k) => sum + weakness(g, k, rate), 0) / keys.length;
    if (score > bestScore) [best, bestScore] = [p, score];
  }
  return best;
}

/** Correct keys / all keys in percent, rounded down to 0.1: it never shows the 95.0 an A needs before it is earned. */
export function accuracy(g: Game): number {
  const shots = g.hits + g.misses;
  return shots > 0 ? Math.floor((1000 * g.hits) / shots) / 10 : 0;
}

/** A "word" is 5 keys; only correct keys count, over the WPM clock (typingTime). */
export function wpm(g: Game): number {
  return g.typingTime > 0 ? (g.hits / 5) * (60 / g.typingTime) : 0;
}

/** Mission grade, and what the next grade needs. C: failed, B: cleared, A: accuracy 95%+, S: 98%+ and no damage. */
export function grade(g: Game): { grade: 'S' | 'A' | 'B' | 'C'; next: string } {
  if (!g.cleared) return { grade: 'C', next: 'ボスまで倒せば B' };
  const allowA = Math.floor(g.hits / 19); // misses that still give 95%: hits / (hits + m) >= 0.95
  const allowS = Math.floor(g.hits / 49); // 98%
  const damage = MAX_HP - g.hp;
  if (g.misses <= allowS && damage === 0) return { grade: 'S', next: '' };
  if (g.misses > allowA) return { grade: 'B', next: `A まで: 打ち間違いをあと ${g.misses - allowA} 回減らす` };
  const need = [];
  if (g.misses > allowS) need.push(`打ち間違いをあと ${g.misses - allowS} 回減らす`);
  if (damage > 0) need.push(`被弾を 0 に（今回 ${damage}）`);
  return { grade: 'A', next: `S まで: ${need.join('・')}` };
}
