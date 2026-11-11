import { FIELD_W } from './game.ts';

/** Self-made pixel art, drawn once onto small canvases at start. 1 art pixel = PX canvas pixels. */
export const PX = 2;
export const GROUND_Y = 300;
const H = 360;

type Palette = Record<string, string>;

/** A sprite from rows of palette letters ('.' is see-through). Throws on a typo, so a broken sprite shows at load. */
function sprite(rows: string[], palette: Palette): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = rows[0].length * PX;
  c.height = rows.length * PX;
  const g = c.getContext('2d')!;
  rows.forEach((row, y) => {
    if (row.length !== rows[0].length) throw new Error(`sprite row ${y} is ${row.length} wide, not ${rows[0].length}`);
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      if (!palette[ch]) throw new Error(`sprite colour '${ch}' is not in the palette`);
      g.fillStyle = palette[ch];
      g.fillRect(x * PX, y * PX, PX, PX);
    });
  });
  return c;
}

// --- the zombie: faces left, arms reaching for the barricade; upper body and legs are drawn apart and put together
const ZOMBIE: Palette = {
  g: '#8fae74', h: '#5f7a4c', e: '#ff5a4a', m: '#2b1d1d', // skin, skin shade, eye, mouth
  c: '#6d7486', d: '#4a4f5e', r: '#7a2e2e', // shirt, shirt shade, stain
  p: '#4a4234', q: '#332d23', s: '#1c1c1c', // near leg, far leg, shoes
};
const HEAD = [
  '....ggg......',
  '...gggggh....',
  '...egggghh...',
  '...ggggghh...',
  '...mgggh.....',
  '....hhcc.....',
];
const ARMS_UP = [
  'gggggcccdd...',
  'hhhh.ccrcdd..',
  '.....cccccdd.',
  '.....ccccdd..',
  '......ccdd...',
];
const ARMS_DOWN = [ // the arms sway down a pixel on the passing steps
  '.....cccdd...',
  'gggggccrcdd..',
  'hhhh.cccccdd.',
  '.....ccccdd..',
  '......ccdd...',
];
const STRIDE = [
  '......ppqq...',
  '.....pp..qq..',
  '.....pp...qq.',
  '....pp....qq.',
  '....pp.....qq',
  '...pp......qq',
  '..sss......ss',
];
const PASSING = [
  '......ppqq...',
  '......ppqq...',
  '......pp.qq..',
  '......pp.qq..',
  '......pp..q..',
  '......pp.ss..',
  '.....sss.....',
];
const swapLegs = (rows: string[]) => rows.map((r) => r.replace(/[pq]/g, (ch) => (ch === 'p' ? 'q' : 'p')));
/** Four steps: stride, passing, the other stride, passing with the other leg lifted. */
export const ZOMBIE_WALK = [STRIDE, PASSING, swapLegs(STRIDE), swapLegs(PASSING)].map((legs, i) =>
  sprite([...HEAD, ...(i % 2 ? ARMS_DOWN : ARMS_UP), ...legs], ZOMBIE),
);
export const ZOMBIE_BODY_X = 7 * PX; // the body's centre, from the sprite's left edge; the hands reach PX * 7 further

// --- the runner: leans into its run, arms swinging back, a red shirt; two steps
const RUNNER: Palette = { ...ZOMBIE, c: '#8a4444', d: '#5e2e2e', r: '#3a1616' };
const RUN_TOP = [
  '..gggg........',
  '.ggggghh......',
  '.egggghhh.....',
  '.mggggghh.....',
  '..gghhcc......',
  '....ccccdd....',
  '.....cccrcd...',
  '......cccccdgg',
  '.......cccddhh',
  '........ccdd..',
];
const RUN_A = [
  '........ppqq..',
  '.......pp..qq.',
  '......pp....qq',
  '....ppp.....qq',
  '...pp........q',
  '..sss.......ss',
];
const RUN_B = [
  '........ppqq..',
  '........ppqq..',
  '.......pp.qq..',
  '......pp...qq.',
  '......pp..qq..',
  '.....sss..ss..',
];
export const RUNNER_RUN = [RUN_A, RUN_B, swapLegs(RUN_A), swapLegs(RUN_B)].map((legs) => sprite([...RUN_TOP, ...legs], RUNNER));
export const RUNNER_BODY_X = 8 * PX;

// --- the brute: broad and slow, arms out front; a boss is a brute in other colours, drawn twice as big
const BRUTE: Palette = { ...ZOMBIE, c: '#5c6650', d: '#3e4636', r: '#2a2a20', p: '#3a3a44', q: '#2a2a32' };
const BOSS: Palette = { g: '#9a7aa8', h: '#6a4f78', e: '#ffe14a', m: '#1a0f1f', c: '#3c2a44', d: '#28192e', r: '#a83232', p: '#2a2030', q: '#1c1522', s: '#0e0b10' };
const BRUTE_TOP = [
  '......gggg........',
  '.....gggggh.......',
  '.....eggghhh......',
  '.....ggggghh......',
  '.....mgggghh......',
  '...ccccccccccdd...',
  'gggcccccccccccdd..',
  'ggggccccrccccccdd.',
  'hhhhcccccccccccdd.',
  '....ccccccccccddd.',
  '....cccccccccccdd.',
  '.....ccccccccccd..',
];
const BRUTE_A = [
  '.....pppppppqqq...',
  '.....ppppp.qqqq...',
  '....pppp....qqqq..',
  '....ppp......qqq..',
  '...ppp.......qqq..',
  '...ppp........qqq.',
  '..ssss........ssss',
];
const BRUTE_B = [
  '.....pppppppqqq...',
  '......pppppqqq....',
  '......ppppqqq.....',
  '......pppqqqq.....',
  '......pppqqq......',
  '......ppp.qqq.....',
  '.....ssss.ssss....',
];
const bruteFrames = (palette: Palette) => [BRUTE_A, BRUTE_B, swapLegs(BRUTE_A), swapLegs(BRUTE_B)].map((legs) => sprite([...BRUTE_TOP, ...legs], palette));
export const BRUTE_WALK = bruteFrames(BRUTE);
export const BOSS_WALK = bruteFrames(BOSS); // drawn at twice the size
export const BRUTE_BODY_X = 9 * PX;

// --- the survivor behind the barricade, rifle pointing right
const SURVIVOR: Palette = {
  k: '#3b2f2a', f: '#d9b38c', F: '#b08b66', x: '#a84a3a', // hair, skin, skin shade, scarf
  j: '#5b6e4e', J: '#3f4d36', n: '#384052', N: '#272d3b', b: '#1e1e22', // jacket, jacket shade, trousers, trouser shade, boots
  w: '#5a3b24', t: '#2e3138', T: '#7d848e', // stock, metal, metal shine
};
export const PLAYER = sprite([
  '...kkkk.........',
  '..kkkkkk........',
  '..kkfffF........',
  '...ffffF........',
  '...xxxxx........',
  '..jjjjxjj.......',
  '.jjjjjwwttttttTt',
  '.jjjjffwtt......',
  '.Jjjjjjj........',
  '.JJjjjjj........',
  '..JJjjj.........',
  '..nnnnN.........',
  '..nnN.nn........',
  '..nn...nn.......',
  '.nnN...nnN......',
  '.bbb...bbbb.....',
], SURVIVOR);
export const MUZZLE_AT = { x: 16 * PX, y: 6 * PX + PX / 2 }; // the rifle's end, from the sprite's top left

export const FLASH = sprite(['.y.', 'yWy', '.y.'], { y: '#ffd24a', W: '#fff6d0' });

/** Planks nailed across two posts on a row of sandbags; low enough for the rifle to fire over it. */
export const BARRICADE = sprite([
  '.O......O.',
  'ooooooooOo',
  'oOiooooiOo',
  '.O......O.',
  'oooooooooo',
  'oOiooooiOo',
  'sssSsssSss',
  'SssSSssSSs',
  'SSSSSSSSSS',
], { o: '#6b4f32', O: '#4a3622', i: '#9a9a9a', s: '#8a7a5a', S: '#6a5c42' });

// --- the night street: drawn once, with a fixed seed so it is the same every time
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0; // mulberry32
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruined buildings in front of the far skyline: x, width, height in canvas pixels. */
const RUINS = [
  [20, 70, 120], [110, 50, 80], [190, 90, 150], [320, 60, 100], [400, 110, 170], [540, 80, 110],
] as const;

export function nightStreet(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = FIELD_W;
  c.height = H;
  const g = c.getContext('2d')!;
  const rand = seeded(7);
  const dot = (x: number, y: number, color: string, w = 1, h = 1) => {
    g.fillStyle = color;
    g.fillRect(Math.floor(x) * PX, Math.floor(y) * PX, w * PX, h * PX);
  };
  const AW = FIELD_W / PX;
  const AH = H / PX;
  const GY = GROUND_Y / PX;

  // sky: five bands, blended with a 2x2 ordered dither so it stays pixel art
  const SKY = ['#04060d', '#070a16', '#0b1020', '#10172b', '#172038'];
  const BAYER = [[0, 0.5], [0.75, 0.25]];
  for (let y = 0; y < GY; y++) {
    for (let x = 0; x < AW; x++) {
      const v = (y / GY) * (SKY.length - 1);
      const i = Math.min(SKY.length - 1, Math.floor(v) + (v % 1 > BAYER[y % 2][x % 2] ? 1 : 0));
      dot(x, y, SKY[i]);
    }
  }
  // stars that never twinkle (nothing on this screen blinks)
  const MOON = { x: 272, y: 30, r: 9 };
  for (let i = 0; i < 70; i++) {
    const x = rand() * AW;
    const y = rand() * GY * 0.6;
    if (Math.hypot(x - MOON.x, y - MOON.y) > MOON.r + 4) dot(x, y, rand() < 0.2 ? '#9aa3c4' : '#3f4766');
  }
  // the moon: a faint halo, a shaded rim on the lower left, a few craters
  for (let y = -MOON.r - 3; y <= MOON.r + 3; y++) {
    for (let x = -MOON.r - 3; x <= MOON.r + 3; x++) {
      const d = Math.hypot(x, y);
      if (d <= MOON.r) dot(MOON.x + x, MOON.y + y, Math.hypot(x - 2, y + 2) > MOON.r ? '#a8a283' : '#d8d2b0');
      else if (d <= MOON.r + 3 && (x + y) % 2 === 0) dot(MOON.x + x, MOON.y + y, '#1b2340');
    }
  }
  for (const [x, y] of [[-3, -3], [2, 1], [-1, 4], [4, -4]]) dot(MOON.x + x, MOON.y + y, '#bdb793');

  // far skyline: dark blocks with broken roofs
  for (let x = 0; x < AW; ) {
    const w = 6 + Math.floor(rand() * 14);
    const h = 14 + Math.floor(rand() * 26);
    dot(x, GY - h, '#0c111f', w, h);
    if (rand() < 0.5) dot(x + Math.floor(rand() * (w - 2)), GY - h - 2, '#0c111f', 2, 2);
    x += w + Math.floor(rand() * 3);
  }
  // near ruins: a stepped broken corner, a moonlit right edge, empty windows, bent rods, rubble
  for (const [x0, w0, h0] of RUINS) {
    const x = x0 / PX;
    const w = w0 / PX;
    const top = GY - h0 / PX;
    dot(x, top, '#141a2a', w - 7, GY - top);
    dot(x + w - 7, top + 3, '#141a2a', 3, GY - top - 3);
    dot(x + w - 4, top + 9, '#141a2a', 4, GY - top - 9);
    dot(x + w - 1, top + 9, '#222a3e', 1, GY - top - 9);
    dot(x + w - 6, top + 1, '#2c344a', 1, 2);
    dot(x + w - 3, top + 6, '#2c344a', 1, 3);
    for (let wy = top + 5; wy < GY - 6; wy += 6) {
      for (let wx = x + 2; wx < x + w - 4; wx += 5) {
        if (wy < top + 12 && wx > x + w - 8) continue; // the broken corner has no windows
        dot(wx, wy, '#0a0e19', 2, 3);
        if (rand() < 0.15) dot(wx, wy, '#26304a', 2, 1); // moonlight on a pane left in the frame
      }
    }
    for (let i = 0; i < 6; i++) dot(x - 1 + rand() * (w + 2), GY - 1 - Math.floor(rand() * 2), '#1b2131', 1 + Math.floor(rand() * 2), 1);
  }
  // low fog over the street, thicker near the ground
  for (let y = GY - 14; y < GY; y++) {
    for (let x = 0; x < AW; x++) if (rand() < ((y - (GY - 14)) / 14) * 0.35) dot(x, y, '#1c2438');
  }
  // the street: curb, asphalt, faded lane marks, cracks and grit
  dot(0, GY, '#2a261e', AW, 1);
  dot(0, GY + 1, '#1d1a15', AW, AH - GY - 1);
  for (let x = 6; x < AW; x += 34) dot(x, GY + 14, '#2a2620', 10, 1);
  for (let i = 0; i < 14; i++) {
    let x = rand() * AW;
    let y = GY + 3 + rand() * 24;
    for (let k = 0; k < 8; k++) {
      dot(x, y, '#110f0b');
      x += 1;
      y += rand() < 0.5 ? 0 : rand() < 0.5 ? -1 : 1;
    }
  }
  for (let i = 0; i < 80; i++) dot(rand() * AW, GY + 2 + rand() * 28, rand() < 0.5 ? '#2a2620' : '#0f0d0a');
  return c;
}
