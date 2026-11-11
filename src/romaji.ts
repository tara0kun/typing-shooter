/**
 * Romaji for a kana reading, as the Microsoft IME and Google Japanese Input take it: the reading is cut into units (a kana,
 * or a kana with its small kana such as きゃ), and each unit lists every spelling that types it. The first is the guide's:
 * the shortest that works in both IMEs, ties as typing sites show them (si, ti, tu, fu, ji, small kana with l).
 * っ and ん are joined to the unit after them, because how they are typed depends on it (った = tta, んか = nka, んな = nnna).
 */

// one kana: its spellings, the guide's first
const KANA: Record<string, string[]> = {
  あ: ['a'], い: ['i', 'yi'], う: ['u', 'wu', 'whu'], え: ['e'], お: ['o'],
  か: ['ka', 'ca'], き: ['ki'], く: ['ku', 'cu', 'qu'], け: ['ke'], こ: ['ko', 'co'],
  さ: ['sa'], し: ['si', 'shi', 'ci'], す: ['su'], せ: ['se', 'ce'], そ: ['so'],
  た: ['ta'], ち: ['ti', 'chi'], つ: ['tu', 'tsu'], て: ['te'], と: ['to'],
  な: ['na'], に: ['ni'], ぬ: ['nu'], ね: ['ne'], の: ['no'],
  は: ['ha'], ひ: ['hi'], ふ: ['fu', 'hu'], へ: ['he'], ほ: ['ho'],
  ま: ['ma'], み: ['mi'], む: ['mu'], め: ['me'], も: ['mo'],
  や: ['ya'], ゆ: ['yu'], よ: ['yo'],
  ら: ['ra'], り: ['ri'], る: ['ru'], れ: ['re'], ろ: ['ro'],
  わ: ['wa'], を: ['wo'],
  が: ['ga'], ぎ: ['gi'], ぐ: ['gu'], げ: ['ge'], ご: ['go'],
  ざ: ['za'], じ: ['ji', 'zi'], ず: ['zu'], ぜ: ['ze'], ぞ: ['zo'],
  だ: ['da'], ぢ: ['di'], づ: ['du'], で: ['de'], ど: ['do'],
  ば: ['ba'], び: ['bi'], ぶ: ['bu'], べ: ['be'], ぼ: ['bo'],
  ぱ: ['pa'], ぴ: ['pi'], ぷ: ['pu'], ぺ: ['pe'], ぽ: ['po'],
  ゔ: ['vu'],
  ぁ: ['la', 'xa'], ぃ: ['li', 'xi', 'lyi', 'xyi'], ぅ: ['lu', 'xu'], ぇ: ['le', 'xe', 'lye', 'xye'], ぉ: ['lo', 'xo'],
  ゃ: ['lya', 'xya'], ゅ: ['lyu', 'xyu'], ょ: ['lyo', 'xyo'],
  ー: ['-'],
};

// a kana and a small kana typed as one sound
const PAIR: Record<string, string[]> = {
  きゃ: ['kya'], きゅ: ['kyu'], きょ: ['kyo'], ぎゃ: ['gya'], ぎゅ: ['gyu'], ぎょ: ['gyo'],
  しゃ: ['sya', 'sha'], しゅ: ['syu', 'shu'], しょ: ['syo', 'sho'],
  じゃ: ['ja', 'zya', 'jya'], じゅ: ['ju', 'zyu', 'jyu'], じょ: ['jo', 'zyo', 'jyo'],
  ちゃ: ['tya', 'cha', 'cya'], ちゅ: ['tyu', 'chu', 'cyu'], ちょ: ['tyo', 'cho', 'cyo'],
  ぢゃ: ['dya'], ぢゅ: ['dyu'], ぢょ: ['dyo'],
  にゃ: ['nya'], にゅ: ['nyu'], にょ: ['nyo'], ひゃ: ['hya'], ひゅ: ['hyu'], ひょ: ['hyo'],
  びゃ: ['bya'], びゅ: ['byu'], びょ: ['byo'], ぴゃ: ['pya'], ぴゅ: ['pyu'], ぴょ: ['pyo'],
  みゃ: ['mya'], みゅ: ['myu'], みょ: ['myo'], りゃ: ['rya'], りゅ: ['ryu'], りょ: ['ryo'],
  // with ぃ or ぇ, and the sounds of loanwords
  きぃ: ['kyi'], きぇ: ['kye'], ぎぃ: ['gyi'], ぎぇ: ['gye'], しぃ: ['syi'], しぇ: ['sye', 'she'],
  じぃ: ['jyi', 'zyi'], じぇ: ['je', 'zye', 'jye'], ちぃ: ['tyi', 'cyi'], ちぇ: ['tye', 'che', 'cye'],
  にぃ: ['nyi'], にぇ: ['nye'], ひぃ: ['hyi'], ひぇ: ['hye'], びぃ: ['byi'], びぇ: ['bye'], ぴぃ: ['pyi'], ぴぇ: ['pye'],
  みぃ: ['myi'], みぇ: ['mye'], りぃ: ['ryi'], りぇ: ['rye'], ぢぃ: ['dyi'], ぢぇ: ['dye'],
  いぇ: ['ye'], うぁ: ['wha'], うぃ: ['wi', 'whi'], うぇ: ['we', 'whe'], うぉ: ['who'],
  ゔぁ: ['va'], ゔぃ: ['vi', 'vyi'], ゔぇ: ['ve', 'vye'], ゔぉ: ['vo'],
  くぁ: ['qa', 'kwa', 'qwa'], くぃ: ['qi', 'qwi', 'qyi', 'kwi'], くぇ: ['qe', 'qwe', 'qye', 'kwe'], くぉ: ['qo', 'qwo', 'kwo'],
  ぐぁ: ['gwa'], ぐぃ: ['gwi'], ぐぇ: ['gwe'], ぐぉ: ['gwo'],
  すぁ: ['swa'], すぃ: ['swi'], すぇ: ['swe'], すぉ: ['swo'],
  つぁ: ['tsa'], つぃ: ['tsi'], つぇ: ['tse'], つぉ: ['tso'],
  てぃ: ['thi'], てぇ: ['the'], てゅ: ['thu'], でぃ: ['dhi'], でぇ: ['dhe'], でゅ: ['dhu'],
  とぅ: ['twu'], どぅ: ['dwu'],
  ふぁ: ['fa', 'fwa', 'hwa'], ふぃ: ['fi', 'fwi', 'fyi', 'hwi'], ふぇ: ['fe', 'fwe', 'fye', 'hwe'], ふぉ: ['fo', 'fwo', 'hwo'], ふゅ: ['fyu'],
};

// ゃゅょ sounds take only their own spellings (not ki + lya): someone typing si for しゃ would otherwise be told they hit
const WHOLE = /^.[ゃゅょ]$/;
const SMALL_TU = ['ltu', 'xtu', 'ltsu', 'xtsu'];

/** Katakana to hiragana (ー stays), so a loanword reading can be given either way. */
export function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

/** The units of a reading, each with its spellings. Throws on a kana the table does not have, so a bad word shows at once. */
export function romajiUnits(reading: string): string[][] {
  const kana = toHiragana(reading);
  const parts: string[] = [];
  for (let i = 0; i < kana.length; ) {
    const take = PAIR[kana.slice(i, i + 2)] ? 2 : 1;
    parts.push(kana.slice(i, i + take));
    i += take;
  }
  // build from the end: っ and ん need the unit that follows them
  const units: string[][] = [];
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    const next = units[0];
    if (p === 'っ') {
      if (!next) units.unshift(SMALL_TU);
      else {
        // a doubled consonant (tta, cchi, also tchi), or a small つ typed on its own
        const doubled = next.filter((s) => /^[bcdfghjkmpqrstvwxyz]/.test(s)).map((s) => s[0] + s);
        const tch = next.filter((s) => s.startsWith('ch')).map((s) => 't' + s);
        units[0] = unique([...doubled, ...tch, ...SMALL_TU.flatMap((t) => next.map((s) => t + s))]);
      }
    } else if (p === 'ん') {
      if (!next) units.unshift(['nn', 'xn', "n'"]); // at the end a single n would not be a finished ん
      else {
        // a single n only before a key that cannot follow n in another kana (not a vowel, y, n, or ー)
        const single = next.filter((s) => !/^[aiueoyn-]/.test(s)).map((s) => 'n' + s);
        units[0] = unique([...single, ...['nn', 'xn', "n'"].flatMap((n) => next.map((s) => n + s))]);
      }
    } else units.unshift(spellings(p));
  }
  return units;
}

function spellings(part: string): string[] {
  if (part.length === 2) {
    const [a, b] = [KANA[part[0]], KANA[part[1]]];
    if (!a || !b) throw new Error(`no romaji for '${part}'`);
    return WHOLE.test(part) ? PAIR[part] : unique([...PAIR[part], ...a.flatMap((x) => b.map((y) => x + y))]);
  }
  const s = KANA[part];
  if (!s) throw new Error(`no romaji for '${part}'`);
  return s;
}

function unique(list: string[]): string[] {
  return [...new Set(list)];
}
