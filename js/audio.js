// 音まわり：BGM（暗号化したファイルを戻して再生）・効果音（コードで合成）・セリフ（音声ファイル or 読み上げ）
const KEY = 'hajimete-no-christmas-cake-2026'; // scripts/prepare-assets.sh と同じ
const BGM_BASE = 0.3;

let ctx = null;
let master, bgmGain, seGain, voiceGain, noiseBuf;
let bgmBuffer = null, bgmSource = null, wantBGM = false;
let bgmLevel = 0, duckFactor = 1;

export function ready() { return !!ctx; }

// ---------- 音を消す／出す（右上のボタン） ----------
let muted = false;
try { muted = localStorage.getItem('xmas-cake-muted') === '1'; } catch (e) { /* 保存できない環境 */ }
export function isMuted() { return muted; }
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('xmas-cake-muted', m ? '1' : '0'); } catch (e) { /* 保存できない環境 */ }
  if (master) {
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(m ? 0 : 1, t + 0.15);
  }
  if (m && 'speechSynthesis' in window) speechSynthesis.cancel();
}

// 最初のタップの中で呼ぶ（iPad などの自動再生制限を外す）。待たずに先へ進めるよう、同期で終わる
export function unlock() {
  if (ctx) { if (ctx.state !== 'running') ctx.resume().catch(() => {}); return; }
  // 読み上げも、タップの中で一度鳴らしておくと、あとから自由に話せる（iPad）
  if ('speechSynthesis' in window) {
    // 空白だけを読ませると、Chrome では終わりの合図が来ず、読み上げが固まったままになる。短い文字にする
    const u = new SpeechSynthesisUtterance('あ');
    u.volume = 0; u.rate = 2; u.lang = 'ja-JP';
    lastUtter = u;
    speechSynthesis.speak(u);
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
  bgmGain = ctx.createGain(); bgmGain.gain.value = 0; bgmGain.connect(master);
  seGain = ctx.createGain(); seGain.gain.value = 0.6; seGain.connect(master);
  voiceGain = ctx.createGain(); voiceGain.gain.value = 1; voiceGain.connect(master);
  const silent = ctx.createBufferSource();
  silent.buffer = ctx.createBuffer(1, 1, 22050);
  silent.connect(master); silent.start(0);
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  // 音が止まってしまったとき（iPad でアプリを切りかえたあとなど）は、次のタップで戻す
  const wake = () => { if (ctx.state !== 'running') ctx.resume().catch(() => {}); };
  document.addEventListener('pointerdown', wake, true);
  document.addEventListener('pointerup', wake, true);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

// ---------- 音を鳴らしはじめる（入力画面で最初にさわったとき） ----------
// ブラウザは「さわる」前には音を出させてくれない。音を出してよいのは次のできごとの中だけ：
//   マウス … pointerdown　／　指・ペン … pointerup　／　キーボード … keydown　／　click
export function isActivation(e) {
  if (e.type === 'pointerdown') return e.pointerType === 'mouse';
  if (e.type === 'pointerup') return e.pointerType !== 'mouse';
  return e.type === 'click' || e.type === 'keydown' || e.type === 'touchend';
}
let soundStarted = false;
export function startSound(bgmUrl) {
  unlock();
  if (soundStarted) return;
  soundStarted = true;
  preloadVoices();
  playBGM();
  loadBGM(bgmUrl).catch((e) => console.warn('BGM を読み込めませんでした', e));
}

// ---------- BGM ----------
export async function loadBGM(url) {
  const res = await fetch(url);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const k = new TextEncoder().encode(KEY);
  for (let i = 0; i < bytes.length; i++) bytes[i] ^= k[i % k.length];
  bgmBuffer = await ctx.decodeAudioData(bytes.buffer);
  if (wantBGM) startSource();
}
function startSource() {
  if (bgmSource || !bgmBuffer) return;
  bgmSource = ctx.createBufferSource();
  bgmSource.buffer = bgmBuffer;
  bgmSource.loop = true;
  bgmSource.connect(bgmGain);
  bgmSource.start();
  applyBGM(3);
}
export function playBGM() { wantBGM = true; bgmLevel = BGM_BASE; startSource(); }
export function fadeOutBGM(sec = 2) { bgmLevel = 0; applyBGM(sec); }
export function fadeInBGM(sec = 2) { bgmLevel = BGM_BASE; applyBGM(sec); }
function applyBGM(sec) {
  if (!ctx) return;
  const g = bgmGain.gain, t = ctx.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(bgmLevel * duckFactor, t + sec);
}
function duck(on) { duckFactor = on ? 0.35 : 1; applyBGM(on ? 0.25 : 0.9); }

// ---------- セリフ ----------
const voiceBufs = new Map();
const voiceLoading = new Map(); // 読み込み中の音声（id → 読み終わりを待つ Promise）
let voiceList = null;           // voices.json を読み終わるまで待つための Promise
// assets/voice/voices.json（scripts/prepare-assets.sh が作る）にある音声だけ読み込む
export function preloadVoices() {
  if (voiceList) return voiceList;
  voiceList = (async () => {
    let ids = [];
    try {
      const r = await fetch('assets/voice/voices.json');
      if (r.ok) ids = await r.json();
    } catch (e) { /* 音声ファイルがまだないときは読み上げで代わりに話す */ }
    ids.forEach((id) => {
      voiceLoading.set(id, fetch(`assets/voice/${id}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((ab) => (ab ? ctx.decodeAudioData(ab) : null))
        .then((buf) => { if (buf) voiceBufs.set(id, buf); })
        .catch(() => {})
        .finally(() => voiceLoading.delete(id)));
    });
  })();
  return voiceList;
}
const within = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

let stopCurrent = null;
let sayToken = 0;
export function stopVoice() {
  sayToken++;
  if (stopCurrent) { const f = stopCurrent; stopCurrent = null; f(); }
}

// 音声ファイルがあればそれを流す。まだ読み込み中なら少し待つ
// （待たずに読み上げで代わりに話すと、最初の題名が機械の声になり、読み上げも固まりやすい）
export async function say(id, line) {
  stopVoice();
  const tok = sayToken;
  if (ctx && !voiceBufs.has(id)) {
    if (voiceList) await within(voiceList, 2000);
    if (voiceLoading.has(id)) await within(voiceLoading.get(id), 4000);
    if (tok !== sayToken) return; // 待っているあいだに別のセリフ・場面に変わった
  }
  const buf = voiceBufs.get(id);
  if (buf && ctx) return playBuffer(buf);
  return speak(line.text, line.who, line);
}

function playBuffer(buf) {
  return new Promise((resolve) => {
    const s = ctx.createBufferSource();
    s.buffer = buf; s.connect(voiceGain);
    let done = false;
    const fin = () => { if (done) return; done = true; if (stopCurrent === stopper) stopCurrent = null; duck(false); resolve(); };
    const stopper = () => { try { s.stop(); } catch (e) { /* もう止まっている */ } fin(); };
    s.onended = fin;
    stopCurrent = stopper;
    duck(true);
    s.start();
  });
}

let jaVoice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices().filter((v) => /^ja/i.test(v.lang));
  const prefer = ['Kyoko', 'O-ren', 'Google 日本語', 'Nanami', 'Haruka'];
  for (const p of prefer) { const v = voices.find((x) => x.name.includes(p)); if (v) return v; }
  return voices[0] || null;
}
if ('speechSynthesis' in window) {
  jaVoice = pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', () => { jaVoice = pickVoice(); });
}

// ブラウザの読み上げ（音声ファイルがないときの代わり／名前入りの最後のひと言）
export function speak(text, who = 'narrator', opts = {}) {
  stopVoice();
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) { setTimeout(resolve, 600 + text.length * 160); return; }
    const S = speechSynthesis;
    // 話していないときに cancel してすぐ speak すると、Chrome では読み上げが固まって鳴らなくなる。
    // 話しているときだけ止めて、少し間をあけてから話す
    const busy = S.speaking || S.pending;
    if (busy) S.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/……/g, '').trim());
    lastUtter = u; // 話し終わる前に捨てられると、終わりの合図が来ない（Chrome）
    u.lang = 'ja-JP';
    if (jaVoice) u.voice = jaVoice;
    if (who === 'bear') { u.pitch = 0.55; u.rate = 0.85; } else { u.pitch = 1.15; u.rate = 0.92; }
    if (opts.whisper) { u.volume = 0.55; u.rate = 0.7; }
    if (muted) u.volume = 0; // 音を消しているときも、話す長さ（流れ）は同じにする
    let done = false;
    const fin = () => {
      if (done) return; done = true; clearTimeout(timer);
      if (stopCurrent === stopper) stopCurrent = null;
      duck(false); resolve();
    };
    const stopper = () => { speechSynthesis.cancel(); fin(); };
    const timer = setTimeout(fin, 2500 + text.length * 280); // end が来ない端末への保険
    u.onend = fin; u.onerror = fin;
    stopCurrent = stopper;
    duck(true);
    const delay = busy ? 120 : 0;
    setTimeout(() => { if (done) return; S.resume(); S.speak(u); }, delay);
  });
}
let lastUtter = null;

// ---------- 効果音（コードで合成） ----------
const now = () => ctx.currentTime;
function env(g, t, attack, peak, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
function bellTone(f, t, dur = 1.2, vol = 0.3, partials = [[1, 1], [2.76, 0.3], [5.4, 0.1]]) {
  partials.forEach(([m, a]) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * m;
    const g = ctx.createGain();
    env(g, t, 0.004, vol * a, m > 1 ? dur / (m * 0.55) : dur);
    o.connect(g).connect(seGain); o.start(t); o.stop(t + dur + 0.1);
  });
}
function noise(t, dur, { type = 'bandpass', f = 1000, f2 = 0, q = 1, vol = 0.3, attack = 0.01 } = {}) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = ctx.createGain(); env(g, t, attack, vol, dur);
  s.connect(fl).connect(g).connect(seGain); s.start(t); s.stop(t + dur + 0.05);
}
function glide(t, f1, f2, dur, vol, type = 'sine') {
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = ctx.createGain(); env(g, t, 0.005, vol, dur);
  o.connect(g).connect(seGain); o.start(t); o.stop(t + dur + 0.05);
}

const guard = (fn) => (...a) => { if (ctx) fn(...a); };
export const se = {
  // キラッ（押せる合図）
  sparkle: guard((delay = 0) => {
    const t = now() + delay;
    [2093, 2637, 3136, 3951, 4186].forEach((f, i) => bellTone(f, t + i * 0.05, 0.5, 0.06, [[1, 1]]));
  }),
  // ぴょこっ
  pop: guard(() => glide(now(), 320, 760, 0.1, 0.22)),
  // できた！
  chime: guard((delay = 0) => {
    const t = now() + delay;
    [1047, 1319, 1568, 2093].forEach((f, i) => bellTone(f, t + i * 0.09, 1.4, 0.12));
  }),
  // カランコロン
  bell: guard(() => {
    const t = now();
    [[1318, 0], [988, 0.2], [1318, 0.5], [988, 0.68]].forEach(([f, d], i) =>
      bellTone(f, t + d, 1.8, i < 2 ? 0.16 : 0.1, [[1, 1], [2.4, 0.45], [3.9, 0.22], [5.4, 0.1]]));
  }),
  // ガラスをこする音（ごく小さく）
  swish: guard(() => noise(now(), 0.12, { f: 2400, q: 0.9, vol: 0.035 })),
  // キュッ（指でぬれたガラスをこする音）。k = 0〜1（こする速さ）で高さと長さを変える
  squeak: guard((k = 0.5) => {
    const t = now();
    const dur = 0.09 + 0.07 * (1 - k);
    const f0 = 900 + 500 * k + Math.random() * 120, f1 = f0 * (1.35 + 0.25 * Math.random());
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7);
    o.frequency.exponentialRampToValueAtTime(f1 * 0.92, t + dur);
    // ゴムがひっかかるような細かいふるえ
    const lfo = ctx.createOscillator(); lfo.frequency.value = 55 + Math.random() * 25;
    const lfoG = ctx.createGain(); lfoG.gain.value = f0 * 0.06;
    lfo.connect(lfoG).connect(o.frequency);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6;
    bp.frequency.setValueAtTime(f0 * 1.6, t); bp.frequency.linearRampToValueAtTime(f1 * 1.8, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.015);
    g.gain.setValueAtTime(0.09, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(bp).connect(g).connect(seGain);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
  }),
  // 箱を閉じる
  boxClose: guard(() => { const t = now(); glide(t, 150, 60, 0.25, 0.35); noise(t, 0.15, { type: 'lowpass', f: 900, vol: 0.12 }); }),
  // 箱を開ける
  boxOpen: guard(() => { const t = now(); noise(t, 0.55, { f: 500, f2: 2600, q: 0.7, vol: 0.12, attack: 0.15 }); se.sparkle(0.35); }),
  // 灯りが消える（ふっ）
  lightsOff: guard(() => { const t = now(); noise(t, 0.8, { type: 'lowpass', f: 2200, f2: 180, vol: 0.2, attack: 0.08 }); glide(t, 330, 110, 0.8, 0.08); }),
  // マッチで火をつける（しゅっ・ぽっ）
  match: guard(() => {
    const t = now();
    noise(t, 0.2, { type: 'highpass', f: 2800, vol: 0.22 });
    for (let i = 0; i < 5; i++) noise(t + 0.05 + Math.random() * 0.2, 0.02, { f: 3500, q: 2, vol: 0.12 });
    glide(t + 0.22, 240, 120, 0.35, 0.25);
  }),
};

// 調べる用（ブラウザのコンソールから import して見る）
export function debugState() {
  return {
    ctx: ctx ? ctx.state : null, master: master ? master.gain.value : null,
    bgm: bgmGain ? bgmGain.gain.value : null, bgmLoaded: !!bgmBuffer, bgmPlaying: !!bgmSource,
    voices: voiceBufs.size, muted,
  };
}
