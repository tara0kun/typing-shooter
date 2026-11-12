import './style.css';
import {
  BARRICADE, BOSS_WALK, BRUTE_BODY_X, BRUTE_WALK, FLASH, GROUND_Y, MUZZLE_AT, PLAYER, PX, RUNNER_BODY_X, RUNNER_RUN,
  ZOMBIE_BODY_X, ZOMBIE_WALK, nightStreet,
} from './art.ts';
import { fromTop, music, musicOn, toggleMusic } from './music.ts';
import { muted, play, toggleMute, unlock } from './sound.ts';
import {
  ATTACK_TIME, BIG_MAGAZINE, FALL_TIME, FIELD_W, LETTER_W, MAGAZINE, MAX_HP, PLAYER_X, PRACTICE_WORDS, WAVES,
  CATEGORIES, accuracy, difficulty, grade, guide, hurtOf, labelText, labelWidth, level, multiplier, newGame, passages, target, typeKey, update,
  weakKeys, wpm, type Category, type Game, type KeyStats, type Kind, type Lang, type Mode, type Spelling, type Zombie,
} from './game.ts';

const W = FIELD_W;
const H = 360;
const PLAYER_LEFT = 10;
const MUZZLE = { x: PLAYER_LEFT + MUZZLE_AT.x, y: GROUND_Y - PLAYER.height + MUZZLE_AT.y };
const HURT_TIME = 0.5; // the red edge fades over this long, and does not come back sooner (2 a second at most)
const NOTE_TIME = 6; // the notes on new kinds stay this long after the wave's break, at the foot of the screen
const BONUS_TIME = 1.5; // the no-miss bonus stays this long next to the rounds (the quick reload is only 0.5 s)
const TITLE = 'ナイトタイピスト'; // provisional name, the real one is not decided yet
const MONO = 'Consolas, "Courier New", monospace';
const SANS = '"Yu Gothic UI", Meiryo, sans-serif';
const LAST_START = 20;
const BAND_Y = 58; // the boss's band: its heading under the HUD's rounds, which a long line's band would otherwise reach

const canvas = document.querySelector<HTMLCanvasElement>('#screen')!;
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false; // keeps the pixels square when a falling zombie is drawn turned, or a boss drawn big
const BACKGROUND = nightStreet();

/** How each kind is drawn: its walk, where its body is in the sprite, how big, and how far it walks per step. */
const LOOKS: Record<Kind, { frames: HTMLCanvasElement[]; bodyX: number; scale: number; stride: number }> = {
  walker: { frames: ZOMBIE_WALK, bodyX: ZOMBIE_BODY_X, scale: 1, stride: 7 },
  runner: { frames: RUNNER_RUN, bodyX: RUNNER_BODY_X, scale: 1, stride: 9 },
  brute: { frames: BRUTE_WALK, bodyX: BRUTE_BODY_X, scale: 1, stride: 8 },
  boss: { frames: BOSS_WALK, bodyX: BRUTE_BODY_X, scale: 2, stride: 12 },
};
const GIANT = { ...LOOKS.boss, scale: 3, stride: 18 }; // the passage mode's boss
const lookOf = (z: Zombie) => (z.kind === 'boss' && game.mode === 'passage' ? GIANT : LOOKS[z.kind]);
const height = (z: Zombie) => lookOf(z).frames[0].height * lookOf(z).scale;

/** The categories' names on the title, and what each holds in either language. */
const CATEGORY_NAMES: Record<Category, string> = {
  night: '夜の言葉', everyday: '身近な言葉', classic: '昔からの言葉', places: '地名', symbols: '数字・記号・コード',
};
const CATEGORY_NOTES: Record<Category, Record<Lang, string>> = {
  night: { en: '夜の街と暮らしの英単語', ja: '夜の街と暮らしの言葉' },
  everyday: { en: '家・学校・食べ物などの英単語', ja: '家・学校・食べ物など' },
  classic: { en: '英語のことわざ（スペースも打つ）', ja: 'ことわざ・四字熟語・早口言葉' },
  places: { en: '国と首都（英語で）', ja: '都道府県・県庁所在地・国・世界の都市' },
  symbols: { en: '数字・記号・プログラムの 1 行（英語・日本語で同じ）', ja: '数字・記号・プログラムの 1 行（英語・日本語で同じ）' },
};

let screen: 'title' | 'play' | 'result' = 'title';
let choice = 0; // the title menu's chosen line
let startMission = 1; // chosen on the title with the arrow keys, so a fast typist need not sit through the slow missions
let lang: Lang = 'en';
let category: Category = 'night';
export let game: Game = newGame(); // exported only so a script driving the page in a browser can read the state (kept outside the repo)
let paused = false;
let resultAt = 0; // when the results came up (performance.now)
let shot = { at: -1, x: 0, id: 0, hit: false }; // the last round fired
let missAt = -1;
let hurtAt = -1;
let imeAt = -Infinity; // when a key last came through an IME (performance.now)
const history: KeyStats = {}; // tries and misses per key over this page's games: the practice picks words by it (nothing is saved)
const best: Record<string, number> = {}; // the score attack's best on this page, per language and category (bestKey)
const spell: Spelling = {}; // how the player types the kana the guide spells another way, while the page is open
/** Exported only so a script driving the page in a browser can read the screens' state (kept outside the repo). */
export const ui = () => ({ screen, choice, startMission, lang, category, paused, best: { ...best } });
/** The language a game of the chosen words plays in: digits and code are the same in both, and play as the English game. */
const playLang = (): Lang => (category === 'symbols' ? 'en' : lang);
const bestKey = (l: Lang, c: Category) => `${l}:${c}`;

const goal = (l = playLang()) => `目安 ${speed(difficulty(startMission * WAVES, l).wpm, l)}`;
const MENU: { mode: Mode; text: () => string }[] = [
  { mode: 'mission', text: () => `ミッション ${startMission} から（${goal()}）　← → で選ぶ` },
  { mode: 'endless', text: () => '終わりの無い夜（5 ウェーブごとにボス）' },
  { mode: 'attack', text: () => `スコアアタック（${ATTACK_TIME} 秒）${best[bestKey(playLang(), category)] ? `　このページの最高 ${best[bestKey(playLang(), category)]}` : ''}` },
  { mode: 'practice', text: () => `練習（苦手な字が多く出る・体力は減らない・${PRACTICE_WORDS} 語）` },
  { mode: 'passage', text: () => `長文ボス（強さ ${startMission}・${goal(lang)}）　← → で選ぶ` }, // its text is in the language chosen, whatever the category
];
/**
 * A typing speed as players of each language know it: WPM (5 keys a word) for English; keys a second for Japanese,
 * where typing sites call keys a minute "WPM" and the same number would read five times too small.
 * The title's guide is the speed the mission's last wave asks for (about the speed that clears it more often than not).
 */
const speed = (wordsPerMinute: number, l: Lang) => (l === 'ja' ? `1 秒に ${(wordsPerMinute / 12).toFixed(1)} 打` : `${Math.round(wordsPerMinute)} WPM`);

function start(mode: Mode, mission: number) {
  game = newGame(mode, mission, lang, history, spell, category);
  paused = false;
  shot = { at: -1, x: 0, id: 0, hit: false };
  missAt = -1;
  hurtAt = -1;
  screen = 'play';
}

/** A game left (ended, or quit from the pause; once per game): its keys go into the page's history; a score attack may set a best. */
function leave(to: 'title' | 'result') {
  for (const [key, s] of Object.entries(game.keyStats)) {
    const h = (history[key] ??= { tries: 0, misses: 0 });
    h.tries += s.tries;
    h.misses += s.misses;
  }
  const key = bestKey(game.lang, game.category);
  if (to === 'result' && game.mode === 'attack') best[key] = Math.max(best[key] ?? 0, game.score);
  fromTop();
  screen = to;
}

addEventListener('keydown', (e) => {
  unlock();
  // a Japanese IME that is on takes the letters for itself (they come as 'Process', keyCode 229): show how to turn it off
  if (e.isComposing || e.key === 'Process' || e.keyCode === 229) imeAt = performance.now();
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  // no browser shortcuts from typing keys, held ones included: Firefox's quick find on ' and / (on every screen: a key typed
  // as a game ends lands on the results), and mid-fight Tab, which would move focus out of the page (allowed when paused)
  if (e.key.length === 1 || (e.key === 'Tab' && screen === 'play' && !paused)) e.preventDefault();
  // held arrows on the title keep moving through the menu and the missions; any other held key counts once
  if (screen === 'title' && e.key.startsWith('Arrow')) {
    e.preventDefault();
    if (e.key === 'ArrowUp') choice = (choice + MENU.length - 1) % MENU.length;
    if (e.key === 'ArrowDown') choice = (choice + 1) % MENU.length;
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (MENU[choice].mode === 'mission' || MENU[choice].mode === 'passage') startMission = Math.min(LAST_START, Math.max(1, startMission + step));
    return;
  }
  if (e.repeat) return;
  const ch = e.key.length === 1 ? e.key.normalize('NFKC').toLowerCase() : ''; // a full-width 'ａ' counts as 'a'
  // kana instead of letters (kana input with the kana lock on; NFKC turns half-width kana into full-width): hint, no shot
  const kana = /[\u3040-\u30ff]/.test(ch);
  if (kana) imeAt = performance.now();
  if (screen === 'title') {
    if (e.key === 'Enter' || e.key === ' ') start(MENU[choice].mode, startMission);
    if (ch === 'l') lang = lang === 'en' ? 'ja' : 'en';
    if (ch === 'c') category = CATEGORIES[(CATEGORIES.indexOf(category) + 1) % CATEGORIES.length];
    if (ch === 'm') toggleMute();
    if (ch === 'b') toggleMusic();
  } else if (screen === 'result') {
    if (performance.now() - resultAt < 500) return; // a key pressed as the fight ended (Esc meant as pause) must not skip the results
    const next = game.mode === 'mission' && game.cleared ? game.mission + 1 : game.mission;
    if (e.key === 'Enter') start(game.mode, next); // the next mission, or the same again
    if (e.key === ' ' && game.mode === 'mission' && game.cleared) start('mission', game.mission);
    if (e.key === 'Escape') screen = 'title';
  } else {
    if (e.key === 'Escape') paused = !paused;
    else if (paused && ch === 'm') toggleMute();
    else if (paused && ch === 'b') toggleMusic();
    else if (paused && e.key === 'Enter') leave('title');
    else if (!paused && ch && !kana) {
      // any character is a shot, so a digit or a mark is a miss too; Space only where the text has one (typeKey)
      const t = target(game);
      const step = t ? guide(t, game.spell).done.length : 0; // keys of its word typed before this one: each key a step higher
      const r = typeKey(game, ch);
      if (!t || r === 'none') return;
      shot = { at: game.time, x: t.x, id: t.id, hit: r !== 'miss' };
      if (r === 'miss') {
        missAt = game.time;
        play('miss');
      } else play('shot', step);
      if (r === 'part' || r === 'kill') play('kill');
    }
  }
});
// leaving the window (another app or tab) pauses, so no HP is lost while away
addEventListener('blur', () => (paused = true));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) paused = true;
});

let last = performance.now();
requestAnimationFrame(function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); // after a hidden tab, resume instead of jumping ahead
  last = now;
  if (screen === 'play' && !paused) {
    const hp = game.hp;
    update(game, dt);
    if (game.hp < hp) play('hurt');
    // a new red edge only HURT_TIME after the last: zombies arriving one after another never make it flash fast (WCAG 2.3.1)
    if (game.hp < hp && game.time - hurtAt >= HURT_TIME) hurtAt = game.time;
    if (game.over) {
      leave('result');
      resultAt = now;
    }
  }
  // the music: in a game (not paused; a boss's own once one is coming), and on the title while the window has the focus
  music(screen === 'play' ? (paused ? null : game.boss ? 'boss' : 'night') : screen === 'title' && document.hasFocus() ? 'night' : null);
  draw();
  requestAnimationFrame(frame);
});

function draw() {
  ctx.drawImage(BACKGROUND, 0, 0);
  if (screen === 'title') drawTitle();
  else drawField();
  if (performance.now() - imeAt < 4000) drawImeHint();
}

function drawField() {
  for (const z of game.zombies) drawZombie(z);
  // the survivor and the barricade after the zombies: one that reaches it stands behind them (a big one's front foot too)
  drawPlayer();
  ctx.drawImage(BARRICADE, PLAYER_X - 8, GROUND_Y - BARRICADE.height);
  if (screen !== 'result') {
    drawLabels(); // under the results they only clutter the text
    drawBossLine();
  }
  if (shot.hit && game.time - shot.at < 0.06) {
    ctx.strokeStyle = '#ffe680';
    ctx.beginPath();
    ctx.moveTo(MUZZLE.x, MUZZLE.y);
    ctx.lineTo(shot.x, GROUND_Y - 20);
    ctx.stroke();
  }
  drawHurt();
  drawHud();
  if (screen === 'result') drawResult();
  else if (paused) drawPause();
  else if (game.time < game.waveStart) {
    center(`bold 24px ${SANS}`, '#e8e2c8', banner(), 120);
    newKinds().forEach((note, i) => center(`14px ${SANS}`, '#fd3', note, 156 + i * 20));
  } else if (game.time < game.waveStart + NOTE_TIME) drawNotes(newKinds());
}

/**
 * A line for each kind this wave brings that the one before did not (in words, not only a new look); the boss's for the
 * first boss of the game. Under the banner in the break, then a while at the foot of the screen, and in the pause.
 */
function newKinds(): string[] {
  if (game.mode === 'passage') return ['長文ボス: 上の帯の文を前から打つ。1 打ごとに押し戻す。柵に着くと体力 −3'];
  if (game.mode !== 'mission' && game.mode !== 'endless') return [];
  const now = difficulty(level(game), game.lang, game.category);
  const before = game.wave > 1 ? difficulty(level({ ...game, wave: game.wave - 1 }), game.lang, game.category) : { runner: 0, brute: 0 };
  const notes: string[] = [];
  const hurt = hurtOf(game, 'walker'); // 1, or more in a category of long words
  if (game.wave === 1 && hurt > 1) notes.push(`言葉が長いお題: ゾンビは少ないが、柵に着くと体力 −${hurt}`);
  if (now.runner > 0 && before.runner === 0) notes.push(`走るゾンビが出る: 足が速く、言葉は短い${hurt > 1 ? `。柵に着くと体力 −${hurtOf(game, 'runner')}` : ''}`);
  if (now.brute > 0 && before.brute === 0) notes.push(`大柄なゾンビが出る: 言葉が 2 つ。柵に着くと体力 −${hurtOf(game, 'brute')}`);
  if (game.boss && game.bosses === 0) notes.push('ボス: 上の帯の文を区切りごとに打つ。打つたびに押し戻す。柵に着くと体力 −3');
  return notes;
}

/** The notes after the break: small, on the street at the foot of the screen, out of the way of the fight. */
function drawNotes(notes: string[]) {
  ctx.font = `12px ${SANS}`;
  notes.forEach((note, i) => {
    const y = H - 22 - (notes.length - 1 - i) * 18;
    const w = ctx.measureText(note).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(W / 2 - w / 2 - 6, y - 3, w + 12, 17);
    center(`12px ${SANS}`, '#fd3', note, y);
  });
}

/** Where the game is, for the HUD: the mission and wave, the endless wave, the attack's time left, the practice. */
function stage() {
  if (game.mode === 'mission') return `ミッション ${game.mission}　${game.boss ? 'ボス' : `ウェーブ ${game.wave}/${WAVES}`}`;
  if (game.mode === 'endless') return `ウェーブ ${game.wave}${game.boss ? '　ボス' : ''}`;
  if (game.mode === 'attack') return `残り ${Math.min(ATTACK_TIME, Math.max(0, Math.ceil(ATTACK_TIME - (game.time - game.waveStart))))} 秒`;
  return game.mode === 'passage' ? `長文ボス　強さ ${game.mission}` : '練習';
}

function banner() {
  if (game.mode === 'attack') return `スコアアタック　${ATTACK_TIME} 秒`;
  if (game.mode === 'practice') return `練習　${PRACTICE_WORDS} 語`;
  if (game.mode === 'passage') return '長文ボスが来る';
  return game.boss ? `${stage()}が来る` : stage();
}

function drawPlayer() {
  const kick = game.time - shot.at < 0.05 ? PX : 0; // every round, hit or miss, kicks the rifle back a pixel
  ctx.drawImage(PLAYER, PLAYER_LEFT - kick, GROUND_Y - PLAYER.height);
  if (kick) ctx.drawImage(FLASH, MUZZLE.x - kick, MUZZLE.y - FLASH.height / 2);
}

function drawZombie(z: Zombie) {
  const look = lookOf(z);
  const [w, h] = [look.frames[0].width * look.scale, look.frames[0].height * look.scale];
  const left = Math.round((z.x - look.bodyX * look.scale) / PX) * PX; // on the art pixel grid, like the street
  if (z.diedAt === null) {
    const steps = Math.floor((FIELD_W - z.x) / look.stride) + z.id; // a step per stride walked, so the feet do not slide
    const frame = look.frames[((steps % look.frames.length) + look.frames.length) % look.frames.length];
    const flinch = shot.hit && shot.id === z.id && game.time - shot.at < 0.06 ? PX : 0; // each hit jolts it back
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(left + 2 * PX, GROUND_Y - PX / 2, w - 3 * PX, PX);
    ctx.drawImage(frame, left + flinch, GROUND_Y - h, w, h);
    return;
  }
  // the fall: knocked back, then over backwards (away from the player) in three steps, then it fades on the ground; one too
  // near the right edge to lie down behind itself (a boss, the giant) falls forwards instead, so the fall stays on screen
  const t = game.time - z.diedAt;
  const step = Math.min(3, Math.floor(t / 0.1));
  const back = left + w + h <= W;
  ctx.save();
  ctx.translate(back ? left + w : left, GROUND_Y); // turns on its back foot, or its front one
  ctx.rotate(((back ? 1 : -1) * step * Math.PI) / 6);
  ctx.globalAlpha = Math.max(0, Math.min(1, (FALL_TIME - t) / 0.3));
  ctx.drawImage(look.frames[0], (back ? -w : 0) + (step === 0 ? PX : 0), -h, w, h);
  ctx.restore();
}

/** The screen edge glows red for a moment when a zombie reaches the barricade (a cue that does not need the sound). */
function drawHurt() {
  const k = 1 - (game.time - hurtAt) / HURT_TIME;
  if (hurtAt < 0 || k <= 0) return;
  const glow = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.62);
  // a dull red at 0.65 at most: over the dark street and sky the red share of the linear light stays under 0.78 (a red
  // flash needs 0.8) and the luminance change about 0.05 (a flash needs 0.1); only the small moon changes more
  glow.addColorStop(0, 'rgba(170, 60, 60, 0)');
  glow.addColorStop(1, `rgba(170, 60, 60, ${0.65 * k})`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
}

/**
 * A label above each living zombie but the boss (its line has a band of its own). A label that would overlap one already
 * put moves up past it, so every word stays readable. Overlaps are decided on unrounded positions: rounding each label on
 * its own made the gaps wobble and labels flicker between rows.
 */
function drawLabels() {
  const t = target(game);
  const lineH = game.lang === 'ja' ? 31 : 17;
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
  // the target's label is put first, so it keeps its place while others pass it (no jump mid-word); then left to right
  const order = game.zombies.filter((z) => z.diedAt === null && z.kind !== 'boss').sort((a, b) => (a === t ? -1 : b === t ? 1 : a.x - b.x));
  for (const z of order) {
    const w = labelWidth(z, game.spell); // as the player's own spellings draw the romaji (chi is longer than ti)
    const h = lineH + (z.prompts.length > 1 ? 7 : 0); // a brute's label has a row for its words-done squares
    const x0 = z.x - w / 2 - 3;
    const x1 = z.x + w / 2 + 3;
    let y1 = GROUND_Y - height(z) - 2; // just above its head
    for (let moved = true; moved; ) {
      moved = false;
      for (const p of placed) {
        if (x0 < p.x1 + 2 && p.x0 < x1 + 2 && y1 - h < p.y1 + 2 && p.y0 < y1) {
          y1 = p.y0 - 2;
          moved = true;
        }
      }
    }
    placed.push({ x0, x1, y0: y1 - h, y1 });
    drawLabel(z, z === t, Math.round(z.x - w / 2), Math.round(y1 - h + 2), w, h);
  }
}

/** One label: the word (a Japanese one with its romaji under it), typed keys dark green, the next key yellow and underlined. */
function drawLabel(z: Zombie, isTarget: boolean, x: number, y: number, w: number, h: number) {
  const ja = game.lang === 'ja';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(x - 3, y - 2, w + 6, h);
  if (isTarget) {
    ctx.strokeStyle = '#fd3';
    ctx.strokeRect(x - 3.5, y - 2.5, w + 7, h + 1);
  }
  if (z.prompts.length > 1) drawParts(z, x + w / 2 - (z.prompts.length * 8 - 2) / 2, y + h - 8);
  if (ja) {
    ctx.font = `12px ${SANS}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eee';
    ctx.fillText(z.word, x + w / 2, y);
    ctx.textAlign = 'left';
    const keys = guide(z, game.spell);
    drawKeys(keys.done, keys.rest, isTarget, x + (w - LETTER_W * (keys.done.length + keys.rest.length)) / 2, y + 15);
  } else {
    const keys = guide(z, game.spell);
    drawKeys(keys.done, keys.rest, isTarget, x, y);
  }
}

/** Keys of a word: done dark green, the next yellow and underlined (red just after a miss), the rest light. */
function drawKeys(done: string, rest: string, isTarget: boolean, x: number, y: number) {
  ctx.font = `12px ${MONO}`;
  ctx.textBaseline = 'top';
  [...done + rest].forEach((ch, i) => {
    const next = isTarget && i === done.length;
    // typed keys are darker, not only another hue, so they stand apart without colour vision
    ctx.fillStyle = i < done.length ? '#3a7a3a' : next ? (game.time - missAt < 0.15 ? '#f44' : '#fd3') : '#ddd';
    ctx.fillText(ch, x + i * LETTER_W, y);
    if (next) ctx.fillRect(x + i * LETTER_W, y + 13, LETTER_W, 1);
  });
}

/** A square per word of a zombie with more than one: dark for the words done (not colour alone: also darker). */
function drawParts(z: Zombie, left: number, top: number) {
  z.prompts.forEach((_, i) => {
    ctx.fillStyle = i < z.part ? '#2f4f2f' : '#ddd';
    ctx.fillRect(left + i * 8, top, 6, 5);
  });
}

/** The boss's line, in a band under the HUD: the parts done dim, the one being typed with its keys, the rest light. */
function drawBossLine() {
  const boss = game.zombies.find((z) => z.kind === 'boss' && z.diedAt === null);
  if (!boss) return;
  if (game.mode === 'passage') return drawPassage(boss);
  const isTarget = target(game) === boss;
  const ja = game.lang === 'ja';
  const w = Math.max(labelWidth(boss, game.spell), 120);
  const x = Math.round(W / 2 - w / 2);
  const y = BAND_Y;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(x - 8, y - 6, w + 16, ja ? 40 : 26);
  ctx.strokeStyle = isTarget ? '#fd3' : '#a83232';
  ctx.strokeRect(x - 7.5, y - 5.5, w + 15, ja ? 39 : 25);
  ctx.font = `bold 11px ${SANS}`;
  ctx.fillStyle = '#e66';
  ctx.textBaseline = 'top';
  ctx.fillText('ボス', x - 6, y - 18);
  drawParts(boss, x + w + 8 - boss.prompts.length * 8, y - 13);
  if (ja) {
    // the line's text, part by part (measured, the glyphs are not all 12 px); the romaji of the part being typed under it
    ctx.font = `12px ${SANS}`;
    let px = x + (w - ctx.measureText(labelText(boss)).width) / 2;
    boss.prompts.forEach((p, i) => {
      ctx.fillStyle = i < boss.part ? '#3a7a3a' : i === boss.part ? '#fd3' : '#ddd';
      ctx.fillText(p.show, px, y);
      px += ctx.measureText(p.show).width;
    });
    const keys = guide(boss, game.spell);
    drawKeys(keys.done, keys.rest, isTarget, x + (w - LETTER_W * (keys.done.length + keys.rest.length)) / 2, y + 16);
  } else {
    let px = x + (w - labelText(boss).length * LETTER_W) / 2;
    boss.prompts.forEach((p, i) => {
      if (i === boss.part) {
        const keys = guide(boss, game.spell);
        drawKeys(keys.done, keys.rest, isTarget, px, y);
      } else {
        ctx.font = `12px ${MONO}`;
        ctx.fillStyle = i < boss.part ? '#3a7a3a' : '#ddd';
        ctx.fillText(p.show, px, y);
      }
      px += (p.show.length + 1) * LETTER_W;
    });
  }
}

/**
 * The giant's passage, too long for one line: from the part being typed (its keys under it, or in place for English) on to
 * as many next parts as fit, with the title and a bar of the parts done above.
 */
function drawPassage(boss: Zombie) {
  const isTarget = target(game) === boss;
  const ja = game.lang === 'ja';
  const [left, right, y] = [24, W - 24, BAND_Y];
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(left - 8, y - 6, right - left + 16, ja ? 40 : 26);
  ctx.strokeStyle = isTarget ? '#fd3' : '#a83232';
  ctx.strokeRect(left - 7.5, y - 5.5, right - left + 15, ja ? 39 : 25);
  ctx.textBaseline = 'top';
  ctx.font = `12px ${SANS}`; // not bold: the titles' kanji have many strokes (蜘蛛, 龍)
  ctx.fillStyle = '#e66';
  ctx.fillText(`長文ボス　${passages(game.lang)[game.passage].title}`, left - 6, y - 19);
  const bar = 120;
  ctx.fillStyle = '#ddd';
  ctx.textAlign = 'right';
  ctx.fillText(`${boss.part}/${boss.prompts.length}`, right - bar - 6, y - 19);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ddd';
  ctx.fillRect(right - bar, y - 15, bar, 6);
  ctx.fillStyle = '#2f4f2f'; // the parts done: darker, not only another colour
  ctx.fillRect(right - bar, y - 15, (bar * boss.part) / boss.prompts.length, 6);
  const keys = guide(boss, game.spell);
  let px = left;
  if (ja) {
    ctx.font = `12px ${SANS}`;
    drawKeys(keys.done, keys.rest, isTarget, left, y + 16);
  } else {
    drawKeys(keys.done, keys.rest, isTarget, left, y);
    px += (keys.done.length + keys.rest.length + 1) * LETTER_W;
  }
  ctx.font = ja ? `12px ${SANS}` : `12px ${MONO}`;
  for (let i = ja ? boss.part : boss.part + 1; i < boss.prompts.length; i++) {
    const text = boss.prompts[i].show;
    const w = ctx.measureText(text).width;
    if (px + w > right) break;
    ctx.fillStyle = i === boss.part ? '#fd3' : '#999'; // the parts after the one being typed dimmer, so its end shows
    ctx.fillText(text, px, y);
    px += w + (ja ? 0 : LETTER_W);
  }
}

function drawHud() {
  ctx.textBaseline = 'top';
  ctx.font = `12px ${SANS}`;
  ctx.fillStyle = '#ddd';
  if (game.mode === 'practice') ctx.fillText(`練習 ${Math.min(game.spawned, PRACTICE_WORDS)}/${PRACTICE_WORDS} 語`, 10, 9);
  else {
    ctx.fillText('体力', 10, 9);
    for (let i = 0; i < MAX_HP; i++) {
      ctx.fillStyle = i < game.hp ? '#e33' : '#422';
      ctx.fillRect(38 + i * 9, 11, 7, 10);
    }
  }
  ctx.fillStyle = '#ddd';
  ctx.fillText(`スコア ${game.score}`, 140, 9);
  ctx.fillText(`コンボ ${game.combo} ×${multiplier(game.combo).toFixed(1)}`, 260, 9);
  ctx.textAlign = 'right';
  ctx.fillText(stage(), W - 10, 9);
  ctx.textAlign = 'left';
  if (game.ammo > 0) {
    for (let i = 0; i < game.magazine; i++) {
      // rounds left bright (the 10 more a magazine without a miss earned in blue, spent first), spent ones dark
      ctx.fillStyle = i >= game.ammo ? '#3a3528' : i >= MAGAZINE ? '#8fd0ff' : '#e8d27a';
      ctx.fillRect(10 + i * 4, 28, 2, 8);
    }
  } else {
    ctx.fillText('装填中', 10, 26);
    ctx.fillStyle = '#3a3528';
    ctx.fillRect(56, 29, 56, 6); // the track, so the end of the reload can be seen
    ctx.fillStyle = '#ddd';
    ctx.fillRect(56, 29, 56 * (1 - (game.reloadUntil - game.time) / game.reloadLen), 6); // fills over the reload
  }
  // only in play: on the results the clock has stopped, and the line would stay under their title
  if (screen === 'play' && game.time - game.bonusAt < BONUS_TIME) {
    ctx.fillStyle = '#fd3';
    ctx.fillText(`ノーミス！ +${game.bonus}・次は ${BIG_MAGAZINE} 発`, 180, 26);
  }
}

function drawTitle() {
  shade(0.5);
  center(`bold 40px ${SANS}`, '#e8e2c8', TITLE, 22);
  MENU.forEach((item, i) => {
    const on = i === choice;
    center(`${on ? 'bold ' : ''}15px ${SANS}`, on ? '#fd3' : '#bbb', `${on ? '▶ ' : ''}${item.text()}`, 82 + i * 22);
  });
  center(`14px ${SANS}`, '#fd3', `L　言葉: ${lang === 'en' ? '英語' : '日本語（ローマ字で打つ）'}　　${soundLine()}`, 202);
  center(`14px ${SANS}`, '#fd3', `C　お題: ${CATEGORY_NAMES[category]}（${CATEGORY_NOTES[category][lang]}）`, 224);
  center(`13px ${SANS}`, '#bbb', '↑ ↓ で選んで Enter。ゾンビの言葉を打って倒す（1 文字 = 1 発・ミスが少ないと装填が速い）', 256);
  center(`13px ${SANS}`, '#bbb', '左の柵まで来られると体力が減る。0 でゲームオーバー。Esc で一時停止', 276);
  center(`12px ${SANS}`, '#999', '※ キーボードが必要です（半角英字で打ってください）', 300);
}

const soundLine = () => `M　効果音 ${muted ? 'オフ' : 'オン'}　B　BGM ${musicOn ? 'オン' : 'オフ'}`;

function drawPause() {
  shade(0.6);
  center(`bold 32px ${SANS}`, '#e8e2c8', '一時停止', 116);
  center(`14px ${SANS}`, '#fd3', 'Esc で続ける　Enter でタイトルへ', 168);
  center(`14px ${SANS}`, '#fd3', `${soundLine()}（押すと切り替え）`, 192);
  newKinds().forEach((note, i) => center(`13px ${SANS}`, '#ddd', note, 232 + i * 20)); // time to read them
}

/** Shown for a few seconds after a key came through an IME or as kana: those keys never shoot. */
function drawImeHint() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(W / 2 - 220, 296, 440, 46);
  ctx.strokeStyle = '#fd3';
  ctx.strokeRect(W / 2 - 219.5, 296.5, 439, 45);
  center(`bold 14px ${SANS}`, '#fd3', '英字が届いていません（日本語入力・かな入力のようです）', 302);
  center(`13px ${SANS}`, '#ddd', '「半角/全角」キーなどで英字の入力に切り替えてください', 322);
}

function drawResult() {
  shade(0.7);
  let keys = 'Enter もう一度　Esc タイトル';
  if (game.mode === 'mission') {
    const r = grade(game);
    center(`bold 30px ${SANS}`, game.cleared ? '#e8e2c8' : '#e33', game.cleared ? `ミッション ${game.mission} クリア` : 'ゲームオーバー', 26);
    center(`bold 36px ${SANS}`, '#fd3', `評価 ${r.grade}`, 74);
    center(`13px ${SANS}`, '#fd3', r.next, 130);
    if (game.cleared) keys = 'Enter 次のミッション　Space もう一度　Esc タイトル';
  } else if (game.mode === 'endless') {
    center(`bold 30px ${SANS}`, '#e33', 'ゲームオーバー', 36);
    center(`bold 20px ${SANS}`, '#e8e2c8', `ウェーブ ${game.wave} まで生き延びた（ボスを ${game.bosses} 体）`, 100);
  } else if (game.mode === 'passage') {
    const r = grade(game);
    const p = passages(game.lang)[game.passage];
    const giant = game.zombies.find((z) => z.kind === 'boss' && z.diedAt === null); // still standing if the game was lost
    center(`bold 30px ${SANS}`, game.cleared ? '#e8e2c8' : '#e33', game.cleared ? '長文ボスを倒した' : 'ゲームオーバー', 26);
    center(`bold 36px ${SANS}`, '#fd3', `評価 ${r.grade}`, 70);
    center(`13px ${SANS}`, '#fd3', r.next, 118);
    if (p) center(`13px ${SANS}`, '#ddd', `${p.title}　${giant ? giant.part : p.parts.length}/${p.parts.length} 区切り`, 140);
  } else if (game.mode === 'attack') {
    const top = best[bestKey(game.lang, game.category)] ?? 0;
    center(`bold 30px ${SANS}`, game.cleared ? '#e8e2c8' : '#e33', game.cleared ? 'タイムアップ' : 'ゲームオーバー', 26);
    center(`bold 30px ${SANS}`, '#fd3', `スコア ${game.score}`, 74);
    center(`13px ${SANS}`, '#fd3', game.score >= top ? 'このページの最高' : `このページの最高 ${top}`, 124);
  } else {
    center(`bold 30px ${SANS}`, '#e8e2c8', '練習おわり', 26);
    const weak = weakKeys(game.keyStats); // this run's
    center(`15px ${SANS}`, '#fd3', weak.length ? `苦手な字: ${weak.map((k) => `${k.key === ' ' ? 'スペース' : k.key}（${k.tries} 回中 ${k.misses} 回ミス）`).join('　')}` : '苦手な字は見つからなかった', 90);
  }
  center(`15px ${SANS}`, '#ddd', `倒した数 ${game.kills}　命中率 ${accuracy(game).toFixed(1)}%　速さ ${speed(wpm(game), game.lang)}`, 172);
  center(`15px ${SANS}`, '#ddd', `最大コンボ ${game.maxCombo}　スコア ${game.score}`, 198);
  center(`14px ${SANS}`, '#fd3', keys, 260);
}

function shade(alpha: number) {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

function center(font: string, color: string, text: string, y: number) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(text, W / 2, y);
  ctx.textAlign = 'left';
}
