// 全体のしくみ：画面の拡大縮小・シーンの切りかえ・ふきだし・キー操作
import * as audio from './audio.js';
import { STAGE_W, STAGE_H, LINES, IMAGES, CAKES } from './data.js';
import { findSpot, autoTarget } from './cake.js';
import s0 from './scenes/s0-start.js';
import s1 from './scenes/s1-window.js';
import s2 from './scenes/s2-decorate.js';
import s3 from './scenes/s3-box.js';
import s4 from './scenes/s4-home.js';
import s5 from './scenes/s5-candle.js';

const SCENES = [s0, s1, s2, s3, s4, s5];
const ABORT = Symbol('abort');
const params = new URLSearchParams(location.search);

const stage = document.getElementById('stage');
const curtain = document.getElementById('curtain');
let scale = 1;

// ---------- 画面の拡大縮小（1536×1024 のステージを画面に合わせる） ----------
function fit() {
  const vw = window.innerWidth, vh = window.innerHeight;
  scale = Math.min(vw / STAGE_W, vh / STAGE_H);
  const x = (vw - STAGE_W * scale) / 2, y = (vh - STAGE_H * scale) / 2;
  stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
}
window.addEventListener('resize', fit);
fit();

export function toStage(e) {
  const r = stage.getBoundingClientRect();
  return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
}

// iPad のピンチ・ダブルタップ拡大を止める
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// ---------- 音のオン・オフ（右上のボタン。どのシーンでも出す） ----------
const soundBtn = document.createElement('button');
soundBtn.type = 'button';
soundBtn.className = 'sound-btn';
const ICON_ON = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 19h8l10-8v26l-10-8H8z" fill="currentColor"/><path d="M31 17c3 2 4.5 4.6 4.5 7s-1.5 5-4.5 7M35.5 12c5 3.4 7.5 7.6 7.5 12s-2.5 8.6-7.5 12" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 19h8l10-8v26l-10-8H8z" fill="currentColor"/><path d="M32 18l12 12M44 18L32 30" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"/></svg>';
function paintSound() {
  const m = audio.isMuted();
  soundBtn.innerHTML = m ? ICON_OFF : ICON_ON;
  soundBtn.classList.toggle('off', m);
  soundBtn.setAttribute('aria-label', m ? 'おとを だす' : 'おとを けす');
}
paintSound();
soundBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
soundBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  audio.setMuted(!audio.isMuted());
  paintSound();
});
stage.appendChild(soundBtn);

// ---------- 状態 ----------
export const state = { name: '', cake: null, decos: [] };

// ---------- 画像の先読み ----------
export const imagesReady = Promise.all(IMAGES.map((src) => new Promise((res) => {
  const i = new Image();
  i.onload = () => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()).then(res);
  i.onerror = res;
  i.src = src;
})));

// ---------- ふきだし ----------
const bubble = document.createElement('div');
bubble.className = 'bubble hidden';
stage.appendChild(bubble);
const bubbleText = document.createElement('span');
const bubbleTail = document.createElement('div');
bubbleTail.className = 'tail';
bubble.append(bubbleText, bubbleTail);
let bubbleToken = 0;

// anchor：{ x, y, side, to }
//   side 'bottom' … (x, y) がふきだしの下の中央　／　side 'right' … (x, y) がふきだしの右の中央
//   to … 話している人（くまの口元）。しっぽをそちらへ向ける
export function showBubble(text, who, anchor) {
  if (typeof anchor === 'function') anchor = anchor();
  bubbleText.textContent = text;
  bubble.className = 'bubble ' + (anchor ? 'by-bear' : 'narrator');
  bubble.style.left = ''; bubble.style.top = '';
  bubbleTail.style.display = 'none';
  if (!anchor) return;
  const w = bubble.offsetWidth, h = bubble.offsetHeight;
  let left, top;
  if (anchor.side === 'right') { left = anchor.x - w; top = anchor.y - h / 2; }
  else { left = anchor.x - w / 2; top = anchor.y - h; }
  left = Math.max(20, Math.min(STAGE_W - 20 - w, left));
  top = Math.max(20, Math.min(STAGE_H - 20 - h, top));
  bubble.style.left = left + 'px';
  bubble.style.top = top + 'px';
  if (!anchor.to) return;
  // しっぽ：ふきだしのふちの、話し手にいちばん近い所から、話し手の方へ
  const tx = anchor.to.x - left, ty = anchor.to.y - top;
  const bx = Math.max(36, Math.min(w - 36, tx)), by = Math.max(30, Math.min(h - 30, ty));
  const edges = [
    { x: bx, y: h, d: ty - h },    // 下
    { x: w, y: by, d: tx - w },    // 右
    { x: 0, y: by, d: -tx },       // 左
    { x: bx, y: 0, d: -ty },       // 上
  ].sort((a, b) => b.d - a.d);
  const e = edges[0];
  const ang = Math.atan2(ty - e.y, tx - e.x);
  const len = Math.max(30, Math.min(64, Math.hypot(tx - e.x, ty - e.y) - 12));
  const inset = 16;
  bubbleTail.style.display = '';
  bubbleTail.style.width = (len + inset) + 'px';
  bubbleTail.style.left = (e.x - Math.cos(ang) * inset) + 'px';
  bubbleTail.style.top = (e.y - Math.sin(ang) * inset) + 'px';
  bubbleTail.style.transform = `translateY(-50%) rotate(${ang}rad)`;
}
export function hideBubble() { bubble.classList.add('hidden'); }

export async function talk(id, anchor) {
  const line = LINES[id];
  const tok = ++bubbleToken;
  if (line.noBubble) hideBubble();
  else showBubble(line.text, line.who, line.who === 'bear' ? anchor : null);
  await audio.say(id, line);
  if (tok === bubbleToken) hideBubble();
}
export async function talkText(text, who = 'narrator') {
  const tok = ++bubbleToken;
  showBubble(text, who, null);
  await audio.speak(text, who);
  if (tok === bubbleToken) hideBubble();
}

// ---------- シーンの道具箱 ----------
function makeCtx(index) {
  const root = document.createElement('div');
  root.className = 'scene';
  stage.insertBefore(root, bubble);
  const timers = new Set();
  const cleanups = [];
  const ctx = {
    root, state, index, params, alive: true, hotkeys: {},
    go, toStage, imagesReady, startTarget,
    // ナレーターのふきだしを画面の下に出す（上に大事な絵があるとき）
    narratorBottom(on) { stage.classList.toggle('narr-bottom', on); },
    run(fn) {
      try {
        const r = fn();
        if (r && r.catch) r.catch((err) => { if (err !== ABORT) console.error(err); });
      } catch (err) { if (err !== ABORT) console.error(err); }
    },
    later(ms, fn) {
      const id = setTimeout(() => { timers.delete(id); if (ctx.alive) ctx.run(fn); }, ms);
      timers.add(id);
      return id;
    },
    clear(id) { clearTimeout(id); timers.delete(id); },
    wait(ms) {
      return new Promise((res, rej) => {
        const id = setTimeout(() => { timers.delete(id); if (ctx.alive) res(); else rej(ABORT); }, ms);
        timers.add(id);
      });
    },
    async talk(id, anchor) {
      if (!ctx.alive) throw ABORT;
      await talk(id, anchor);
      if (!ctx.alive) throw ABORT;
    },
    async talkText(text, who) {
      if (!ctx.alive) throw ABORT;
      await talkText(text, who);
      if (!ctx.alive) throw ABORT;
    },
    on(target, ev, fn, opt) {
      const h = (e) => ctx.run(() => fn(e));
      target.addEventListener(ev, h, opt);
      cleanups.push(() => target.removeEventListener(ev, h, opt));
    },
    loop(fn) {
      let id;
      const tick = (t) => { if (!ctx.alive) return; fn(t); id = requestAnimationFrame(tick); };
      id = requestAnimationFrame(tick);
      cleanups.push(() => cancelAnimationFrame(id));
    },
    onDispose(fn) { cleanups.push(fn); },
    dispose() {
      ctx.alive = false;
      timers.forEach(clearTimeout);
      cleanups.forEach((f) => f());
      root.remove();
    },
  };
  return ctx;
}

// ---------- シーンの切りかえ ----------
let current = null;
let busy = false;
function curtainTo(op, dur) {
  const a = curtain.animate([{ opacity: getComputedStyle(curtain).opacity }, { opacity: op }],
    { duration: dur, easing: 'ease-in-out', fill: 'forwards' });
  return a.finished.then(() => { curtain.style.opacity = op; a.cancel(); });
}
export async function go(index, { fade = true } = {}) {
  if (busy) return;
  busy = true;
  stage.classList.add('busy');
  audio.stopVoice();
  hideBubble();
  if (fade) await curtainTo(1, 500);
  if (current) current.dispose();
  stage.classList.remove('narr-bottom');
  fillDefaults(index);
  const ctx = makeCtx(index);
  current = ctx;
  ctx.run(() => SCENES[index].enter(ctx));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (fade) await curtainTo(0, 650);
  busy = false;
  stage.classList.remove('busy');
}

// 途中のシーンから始めたとき（?scene= やキー操作）に足りない選択をうめる
function fillDefaults(index) {
  if (index >= 2 && state.cake == null) state.cake = Math.min(3, Math.max(0, parseInt(params.get('cake'), 10) || 0));
  if (index >= 3 && state.decos.length === 0) {
    const cake = CAKES[state.cake];
    ['santa', 'snowman', 'candy'].forEach((id, i) => {
      const spot = findSpot(cake, 400, autoTarget(cake, 400, i), state.decos, id);
      state.decos.push({ id, ...spot });
    });
  }
}

// ---------- キー操作（発表用） ----------
//   C … 窓の曇りを全部晴らす　　N … 次のシーンへ
window.addEventListener('keydown', (e) => {
  if (!current || e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase();
  if (current.hotkeys[k]) { current.run(current.hotkeys[k]); return; }
  if (k === 'n' && current.index > 0 && current.index < SCENES.length - 1 && audio.ready()) go(current.index + 1);
});

// ---------- はじまり ----------
export function startTarget() {
  const n = parseInt(params.get('scene'), 10);
  return n >= 1 && n <= 5 ? n : 1;
}
go(0, { fade: false }).then(() => curtainTo(0, 400));
