// 作品全体で使うデータ（画像・ケーキ・飾り・セリフ）
export const STAGE_W = 1536;
export const STAGE_H = 1024;
export const IMG = 'assets/img/';

// ケーキ。座標はすべて「画像の幅・高さに対する割合」
//   top    : 飾りの足元を置ける天面（だ円）
//   candle : ろうそくの足元（丸いケーキは天面のまんなか。2026-11-25 に奥から寄せた）
//   plate  : チョコプレートの足元。天面に立てる（w = プレートの幅。なければケーキの幅の 0.34）
export const CAKES = [
  { id: 'shortcake', src: 'cake-shortcake.png', w: 501, h: 490, voice: 'b01',
    top: { cx: 0.5, cy: 0.34, rx: 0.33, ry: 0.15 }, candle: { x: 0.5, y: 0.29 }, plate: { x: 0.5, y: 0.38 } },
  { id: 'choco', src: 'cake-choco.png', w: 512, h: 498, voice: 'b02',
    top: { cx: 0.5, cy: 0.34, rx: 0.33, ry: 0.15 }, candle: { x: 0.5, y: 0.29 }, plate: { x: 0.5, y: 0.38 } },
  { id: 'buche', src: 'cake-buche.png', w: 548, h: 396, voice: 'b03',
    top: { cx: 0.58, cy: 0.17, rx: 0.27, ry: 0.06 }, candle: { x: 0.58, y: 0.13 }, plate: { x: 0.58, y: 0.235, w: 0.28 } },
  { id: 'santa', src: 'cake-santa.png', w: 526, h: 526, voice: 'b04',
    top: { cx: 0.5, cy: 0.45, rx: 0.34, ry: 0.13 }, candle: { x: 0.5, y: 0.41 }, plate: { x: 0.5, y: 0.49 } },
];

export const DECOS = [
  { id: 'santa',    src: 'deco-santa.png',    w: 208, h: 320, voice: 'b09' },
  { id: 'reindeer', src: 'deco-reindeer.png', w: 250, h: 320, voice: 'b10' },
  { id: 'snowman',  src: 'deco-snowman.png',  w: 238, h: 320, voice: 'b11' },
  { id: 'holly',    src: 'deco-holly.png',    w: 320, h: 234, voice: 'b12' },
  { id: 'house',    src: 'deco-house.png',    w: 320, h: 292, voice: 'b13' },
  { id: 'candy',    src: 'deco-candy.png',    w: 206, h: 320, voice: 'b14' },
];

// くまのポーズ。ax = 体の中心が画像の左から何割の位置にあるか
export const BEAR_POSES = {
  standing: { src: 'bear-standing.png', w: 536, h: 900, ax: 0.5 },
  tray:     { src: 'bear-tray.png',     w: 496, h: 900, ax: 0.5 },
  secret:   { src: 'bear-secret.png',   w: 642, h: 900, ax: 0.37 },
  ribbon:   { src: 'bear-ribbon.png',   w: 494, h: 900, ax: 0.5 },
};

export const BGM_FILE = 'assets/audio/bgm-santas-coming.dat';

export const IMAGES = [
  'bg-exterior.jpg', 'bg-shop.jpg', 'bg-living.jpg',
  ...Object.values(BEAR_POSES).map((p) => p.src),
  ...CAKES.map((c) => c.src), ...DECOS.map((d) => d.src),
  'plate.png', 'candle.png', 'box.png', 'cake-plate.png', 'mitten.png',
].map((f) => IMG + f);

// セリフ（output/2026-11-23_voice-lines/voice-lines.md と同じ）
// 音声ファイル assets/voice/<id>.mp3 があればそれを流し、なければブラウザの読み上げで代わりに読む
// read … VOICEVOX に渡す読み（漢字まじりにすると、ことばの区切りとアクセントが自然になる）。画面のふきだしは text
export const LINES = {
  n01: { who: 'narrator', text: 'はじめての クリスマスケーキ', read: '初めての、クリスマスケーキ', noBubble: true },
  n02: { who: 'narrator', text: 'まどが くもってるね。ゆびで こすって みよう', read: '窓が曇ってるね。指で、こすってみよう' },
  n03: { who: 'narrator', text: 'ごしごし してみて', read: 'ごしごし、してみて' },
  n04: { who: 'narrator', text: 'あっ、なにか みえたよ！', read: 'あっ、何か見えたよ！' },
  n05: { who: 'narrator', text: 'わあ、ケーキが いっぱい！ すきなのを さわってね', read: 'わあ、ケーキがいっぱい！好きなのを、触ってね' },
  b01: { who: 'bear', text: 'いちごの ケーキ、これに する？', read: '苺のケーキ、これにする？' },
  b02: { who: 'bear', text: 'チョコの ケーキ、これに する？', read: 'チョコのケーキ、これにする？' },
  b03: { who: 'bear', text: 'きりかぶの ケーキ、これに する？', read: '切り株のケーキ、これにする？' },
  b04: { who: 'bear', text: 'サンタさんの ケーキ、これに する？', read: 'サンタさんのケーキ、これにする？' },
  b04h: { who: 'bear', text: 'いいなら、まるを さわってね', read: 'いいなら、丸を触ってね' },
  b05: { who: 'bear', text: 'いいね！ おみせに どうぞ', read: 'いいね！お店にどうぞ' },
  b06: { who: 'bear', text: 'いらっしゃいませ！', read: 'いらっしゃいませ！' },
  b07: { who: 'bear', text: 'ケーキに なにを のせようか？ どれに する？', read: 'ケーキに何を載せようか？どれにする？' },
  b08: { who: 'bear', text: 'どれに しようかな？', read: 'どれにしようかな？' },
  b09: { who: 'bear', text: 'サンタさん！' },
  b10: { who: 'bear', text: 'トナカイ！' },
  b11: { who: 'bear', text: 'ゆきだるま！' },
  b12: { who: 'bear', text: 'ひいらぎ！', read: '柊！' },
  b13: { who: 'bear', text: 'おかしの おうち！', read: 'お菓子のおうち！' },
  b14: { who: 'bear', text: 'キャンディ！' },
  b15: { who: 'bear', text: 'わあ、すてきな ケーキに なったね！', read: 'わあ、素敵なケーキになったね！' },
  b16: { who: 'bear', text: 'はこに いれるね', read: '箱に入れるね' },
  b17: { who: 'bear', text: 'あっ、そうだ' },
  b18: { who: 'bear', text: '……ないしょだよ', read: '内緒だよ', whisper: true },
  b19: { who: 'bear', text: 'はい、どうぞ。きを つけて もってかえってね', read: 'はい、どうぞ。気をつけて、持って帰ってね' },
  b21: { who: 'bear', text: 'ゆびで つまんで、ケーキに のせてね', read: '指でつまんで、ケーキに載せてね' },
  b22: { who: 'bear', text: 'これで できあがり？', read: 'これで、出来上がり？' },
  b23: { who: 'bear', text: 'みっつまで のせられるよ', read: '三つまで、載せられるよ' },
  n06: { who: 'narrator', text: 'おうちに ついたよ。はこを あけて みよう', read: 'おうちに着いたよ。箱を、開けてみよう' },
  n07: { who: 'narrator', text: 'はこを さわってみて', read: '箱を、触ってみて' },
  n08: { who: 'narrator', text: 'わあ、すてきな ケーキ！', read: 'わあ、素敵なケーキ！' },
  n09: { who: 'narrator', text: 'でんきを けすよ。ろうそくを さわって みて', read: '電気を消すよ。蝋燭を、触ってみて' },
  n10: { who: 'narrator', text: 'ろうそくを さわってね', read: '蝋燭を触ってね' },
  n11: { who: 'narrator', text: 'あれ？ なにか かいてあるよ', read: 'あれ？何か、書いてあるよ' },
  f02: { who: 'narrator', text: 'メリークリスマス' },
  n12: { who: 'narrator', text: 'もういっかい あそぶ？', read: 'もう一回、遊ぶ？' },
};

export const CREDITS = 'こえ：VOICEVOX:ちび式じい ／ VOICEVOX:四国めたん　おんがく：えだまめ88（OpenTracks）';
