import type { Words } from './game.ts';

/**
 * Old sayings (昔からの言葉): traditional English proverbs, typed with their spaces; Japanese 四字熟語 and ことわざ, and for the
 * bosses longer ことわざ and traditional 早口言葉. Long-established sayings that are nobody's own
 * words (most are centuries old; a few came into Japanese in the Meiji era, such as 一石二鳥 and 試行錯誤).
 * English 70 語・ボスの文 14 本; Japanese 120 語・ボスの文 20 本. Grouped by keys into thirds.
 */

export const CLASSIC_EN: Words<string> = {
  short: [
    'time flies', 'less is more', 'know thyself', 'time is money', 'love is blind', 'seize the day',
    'talk is cheap', 'fools rush in', 'live and learn', 'truth will out', 'walls have ears', 'to err is human',
    'haste makes waste', 'silence is golden', 'love conquers all', 'knowledge is power', 'ignorance is bliss', 'a word to the wise',
    'seeing is believing', 'no man is an island', 'old habits die hard', 'look before you leap', 'no news is good news',
  ],
  medium: [
    'the more the merrier', 'patience is a virtue', 'fight fire with fire', 'hope springs eternal', 'a cat has nine lives', 'clothes make the man',
    'still waters run deep', 'you reap what you sow', 'let sleeping dogs lie', 'every dog has its day', 'no smoke without fire', 'bad news travels fast',
    'better late than never', 'practice makes perfect', 'charity begins at home', 'better safe than sorry', 'let bygones be bygones', 'no rest for the wicked',
    'fortune favors the bold', 'tomorrow is another day', 'forewarned is forearmed', 'well begun is half done', 'no rose without a thorn', 'barking dogs seldom bite',
  ],
  long: [
    'practice what you preach', 'no time like the present', 'hunger is the best sauce', 'pride goes before a fall',
    'beauty is only skin deep', 'wonders will never cease', 'a new broom sweeps clean', 'he who hesitates is lost',
    'a watched pot never boils', 'a penny for your thoughts', 'honesty is the best policy', 'many hands make light work',
    'blood is thicker than water', 'fair exchange is no robbery', 'nothing will come of nothing', 'the exception proves the rule',
    'nothing succeeds like success', 'one good turn deserves another', 'little strokes fell great oaks', 'truth is stranger than fiction',
    'actions speak louder than words', 'good fences make good neighbors', 'april showers bring may flowers',
  ],
  lines: [
    ['the early bird', 'catches', 'the worm'],
    ['a stitch', 'in time', 'saves nine'],
    ['birds of', 'a feather', 'flock together'],
    ['strike while', 'the iron', 'is hot'],
    ['make hay', 'while the sun', 'shines'],
    ['all that', 'glitters', 'is not gold'],
    ['a rolling stone', 'gathers', 'no moss'],
    ['necessity', 'is the mother', 'of invention'],
    ['an ounce', 'of prevention', 'is worth', 'a pound', 'of cure'],
    ['time and tide', 'wait for', 'no man'],
    ['the proof', 'of the pudding', 'is in', 'the eating'],
    ['the darkest hour', 'is just', 'before the dawn'],
    ['while there is', 'life', 'there is hope'],
    ['never put off', 'till tomorrow', 'what you can', 'do today'],
  ],
};

export const CLASSIC_JA: Words<[string, string]> = {
  short: [
    ['右往左往', 'うおうさおう'], ['一期一会', 'いちごいちえ'], ['異口同音', 'いくどうおん'], ['四苦八苦', 'しくはっく'],
    ['因果応報', 'いんがおうほう'], ['不老不死', 'ふろうふし'], ['自画自賛', 'じがじさん'], ['喜怒哀楽', 'きどあいらく'],
    ['危機一髪', 'ききいっぱつ'], ['温故知新', 'おんこちしん'], ['一部始終', 'いちぶしじゅう'], ['無我夢中', 'むがむちゅう'],
    ['五里霧中', 'ごりむちゅう'], ['意味深長', 'いみしんちょう'], ['馬耳東風', 'ばじとうふう'], ['起死回生', 'きしかいせい'],
    ['自由自在', 'じゆうじざい'], ['一喜一憂', 'いっきいちゆう'], ['疑心暗鬼', 'ぎしんあんき'], ['朝飯前', 'あさめしまえ'],
    ['十人十色', 'じゅうにんといろ'], ['自業自得', 'じごうじとく'], ['半信半疑', 'はんしんはんぎ'], ['以心伝心', 'いしんでんしん'],
    ['不言実行', 'ふげんじっこう'], ['一心同体', 'いっしんどうたい'], ['試行錯誤', 'しこうさくご'], ['大器晩成', 'たいきばんせい'],
    ['電光石火', 'でんこうせっか'], ['心機一転', 'しんきいってん'], ['用意周到', 'よういしゅうとう'], ['三寒四温', 'さんかんしおん'],
    ['一進一退', 'いっしんいったい'], ['日進月歩', 'にっしんげっぽ'], ['臨機応変', 'りんきおうへん'], ['孤立無援', 'こりつむえん'],
    ['一心不乱', 'いっしんふらん'], ['奇想天外', 'きそうてんがい'], ['四方八方', 'しほうはっぽう'], ['猫の額', 'ねこのひたい'],
  ],
  medium: [
    ['一か八か', 'いちかばちか'], ['一石二鳥', 'いっせきにちょう'], ['八方美人', 'はっぽうびじん'], ['千載一遇', 'せんざいいちぐう'],
    ['油断大敵', 'ゆだんたいてき'], ['言語道断', 'ごんごどうだん'], ['正々堂々', 'せいせいどうどう'], ['前代未聞', 'ぜんだいみもん'],
    ['一朝一夕', 'いっちょういっせき'], ['一長一短', 'いっちょういったん'], ['優柔不断', 'ゆうじゅうふだん'], ['空前絶後', 'くうぜんぜつご'],
    ['一網打尽', 'いちもうだじん'], ['住めば都', 'すめばみやこ'], ['猫に小判', 'ねこにこばん'], ['鬼に金棒', 'おににかなぼう'],
    ['絵にかいた餅', 'えにかいたもち'], ['寝耳に水', 'ねみみにみず'], ['腰を抜かす', 'こしをぬかす'], ['起承転結', 'きしょうてんけつ'],
    ['花鳥風月', 'かちょうふうげつ'], ['絶体絶命', 'ぜったいぜつめい'], ['本末転倒', 'ほんまつてんとう'], ['急がば回れ', 'いそがばまわれ'],
    ['花より団子', 'はなよりだんご'], ['月とすっぽん', 'つきとすっぽん'], ['焼け石に水', 'やけいしにみず'], ['犬猿の仲', 'けんえんのなか'],
    ['適材適所', 'てきざいてきしょ'], ['神出鬼没', 'しんしゅつきぼつ'], ['知らぬが仏', 'しらぬがほとけ'], ['海老で鯛を釣る', 'えびでたいをつる'],
    ['雀の涙', 'すずめのなみだ'], ['袋のねずみ', 'ふくろのねずみ'], ['身の毛もよだつ', 'みのけもよだつ'], ['鳥肌が立つ', 'とりはだがたつ'],
    ['単刀直入', 'たんとうちょくにゅう'], ['一目瞭然', 'いちもくりょうぜん'], ['七転び八起き', 'ななころびやおき'], ['果報は寝て待て', 'かほうはねてまて'],
  ],
  long: [
    ['泣きっ面に蜂', 'なきっつらにはち'], ['一寸先は闇', 'いっすんさきはやみ'], ['灯台下暗し', 'とうだいもとくらし'],
    ['棚からぼたもち', 'たなからぼたもち'], ['出る杭は打たれる', 'でるくいはうたれる'], ['弱肉強食', 'じゃくにくきょうしょく'],
    ['百発百中', 'ひゃっぱつひゃくちゅう'], ['猿も木から落ちる', 'さるもきからおちる'], ['二階から目薬', 'にかいからめぐすり'],
    ['猫の手も借りたい', 'ねこのてもかりたい'], ['噂をすれば影', 'うわさをすればかげ'], ['雨降って地固まる', 'あめふってじかたまる'],
    ['馬の耳に念仏', 'うまのみみにねんぶつ'], ['備えあれば憂いなし', 'そなえあればうれいなし'], ['どんぐりの背比べ', 'どんぐりのせいくらべ'],
    ['狐につままれる', 'きつねにつままれる'], ['目からうろこが落ちる', 'めからうろこがおちる'], ['石の上にも三年', 'いしのうえにもさんねん'],
    ['虎の威を借る狐', 'とらのいをかるきつね'], ['九死に一生を得る', 'きゅうしにいっしょうをえる'], ['覆水盆に返らず', 'ふくすいぼんにかえらず'],
    ['弘法も筆の誤り', 'こうぼうもふでのあやまり'], ['千里の道も一歩から', 'せんりのみちもいっぽから'], ['立つ鳥跡を濁さず', 'たつとりあとをにごさず'],
    ['二度あることは三度ある', 'にどあることはさんどある'], ['犬も歩けば棒に当たる', 'いぬもあるけばぼうにあたる'], ['良薬は口に苦し', 'りょうやくはくちににがし'],
    ['早起きは三文の徳', 'はやおきはさんもんのとく'], ['石橋をたたいて渡る', 'いしばしをたたいてわたる'], ['一難去ってまた一難', 'いちなんさってまたいちなん'],
    ['笑う門には福来る', 'わらうかどにはふくきたる'], ['好きこそ物の上手なれ', 'すきこそもののじょうずなれ'], ['塵も積もれば山となる', 'ちりもつもればやまとなる'],
    ['百聞は一見にしかず', 'ひゃくぶんはいっけんにしかず'], ['能ある鷹は爪を隠す', 'のうあるたかはつめをかくす'], ['三人寄れば文殊の知恵', 'さんにんよればもんじゅのちえ'],
    ['親しき仲にも礼儀あり', 'したしきなかにもれいぎあり'], ['捕らぬ狸の皮算用', 'とらぬたぬきのかわざんよう'], ['頭隠して尻隠さず', 'あたまかくしてしりかくさず'],
    ['桃栗三年柿八年', 'ももくりさんねんかきはちねん'],
  ],
  lines: [
    [['二兎を', 'にとを'], ['追う者は', 'おうものは'], ['一兎をも得ず', 'いっとをもえず']],
    [['暑さ', 'あつさ'], ['寒さも', 'さむさも'], ['彼岸まで', 'ひがんまで']],
    [['船頭', 'せんどう'], ['多くして', 'おおくして'], ['船山に上る', 'ふねやまにのぼる']],
    [['壁に', 'かべに'], ['耳あり', 'みみあり'], ['障子に', 'しょうじに'], ['目あり', 'めあり']],
    [['遠くの', 'とおくの'], ['親類より', 'しんるいより'], ['近くの', 'ちかくの'], ['他人', 'たにん']],
    [['一寸の', 'いっすんの'], ['虫にも', 'むしにも'], ['五分の', 'ごぶの'], ['魂', 'たましい']],
    [['火のない', 'ひのない'], ['所に', 'ところに'], ['煙は', 'けむりは'], ['立たぬ', 'たたぬ']],
    [['捨てる', 'すてる'], ['神あれば', 'かみあれば'], ['拾う', 'ひろう'], ['神あり', 'かみあり']],
    [['喉元', 'のどもと'], ['過ぎれば', 'すぎれば'], ['熱さを', 'あつさを'], ['忘れる', 'わすれる']],
    [['来年の', 'らいねんの'], ['ことを', 'ことを'], ['言えば', 'いえば'], ['鬼が', 'おにが'], ['笑う', 'わらう']],
    [['一年の', 'いちねんの'], ['計は', 'けいは'], ['元旦にあり', 'がんたんにあり']],
    [['雀', 'すずめ'], ['百まで', 'ひゃくまで'], ['踊り', 'おどり'], ['忘れず', 'わすれず']],
    [['生麦', 'なまむぎ'], ['生米', 'なまごめ'], ['生卵', 'なまたまご']],
    [['隣の', 'となりの'], ['客は', 'きゃくは'], ['よく柿食う', 'よくかきくう'], ['客だ', 'きゃくだ']],
    [['東京', 'とうきょう'], ['特許', 'とっきょ'], ['許可局', 'きょかきょく']],
    [['赤巻紙', 'あかまきがみ'], ['青巻紙', 'あおまきがみ'], ['黄巻紙', 'きまきがみ']],
    [['坊主が', 'ぼうずが'], ['屏風に', 'びょうぶに'], ['上手に', 'じょうずに'], ['坊主の', 'ぼうずの'], ['絵をかいた', 'えをかいた']],
    [['すももも', 'すももも'], ['桃も', 'ももも'], ['桃のうち', 'もものうち']],
    [['裏庭には二羽', 'うらにわにはにわ'], ['庭には二羽', 'にわにはにわ'], ['鶏がいる', 'にわとりがいる']],
    [['瓜売りが', 'うりうりが'], ['瓜売りに来て', 'うりうりにきて'], ['瓜売り残し', 'うりうりのこし'], ['売り売り帰る', 'うりうりかえる'], ['瓜売りの声', 'うりうりのこえ']],
  ],
};
