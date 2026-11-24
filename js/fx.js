// 小さな演出（キラキラ・ぴょこっ・ポップ）と、要素づくりの道具
import { IMG } from './data.js';

export function el(tag, cls, parent, style) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (style) Object.assign(e.style, style);
  if (parent) parent.appendChild(e);
  return e;
}
export function img(src, cls, parent, style) {
  const e = el('img', cls, parent, style);
  e.src = IMG + src; e.alt = ''; e.draggable = false;
  return e;
}
// 左上・幅・高さ（ステージの px）で置く
export function box(e, x, y, w, h) {
  e.style.left = x + 'px'; e.style.top = y + 'px';
  if (w != null) e.style.width = w + 'px';
  if (h != null) e.style.height = h + 'px';
  return e;
}

const STAR_COLORS = ['#fff7cf', '#ffe9a6', '#ffffff', '#ffd9a0'];
export function sparkle(parent, x, y, { n = 10, spread = 90, size = 26 } = {}) {
  for (let i = 0; i < n; i++) {
    const s = el('div', 'star', parent);
    const sz = size * (0.5 + Math.random() * 0.7);
    Object.assign(s.style, { left: x + 'px', top: y + 'px', width: sz + 'px', height: sz + 'px',
      background: STAR_COLORS[i % STAR_COLORS.length] });
    const ang = Math.random() * Math.PI * 2;
    const d = spread * (0.35 + Math.random() * 0.65);
    const dx = Math.cos(ang) * d, dy = Math.sin(ang) * d;
    const a = s.animate([
      { transform: 'translate(-50%,-50%) scale(0) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(60deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy * 1.15 + 12}px)) scale(0) rotate(120deg)`, opacity: 0 },
    ], { duration: 700 + Math.random() * 600, easing: 'cubic-bezier(.2,.8,.3,1)', delay: Math.random() * 120 });
    a.onfinish = () => s.remove();
  }
}

// ぴょこっと揺れる（要素の transform-origin は下中央にしておく）
export function hop(e, { h = 26, dur = 560 } = {}) {
  return e.animate([
    { transform: 'translateY(0) scale(1,1)' },
    { transform: 'translateY(0) scale(1.08,.9)', offset: 0.15 },
    { transform: `translateY(-${h}px) scale(.95,1.06)`, offset: 0.45 },
    { transform: 'translateY(0) scale(1.06,.94)', offset: 0.75 },
    { transform: 'translateY(0) scale(1,1)' },
  ], { duration: dur, easing: 'ease-out' });
}

export function popIn(e, { dur = 450, delay = 0 } = {}) {
  return e.animate([
    { transform: 'scale(.4)', opacity: 0 },
    { transform: 'scale(1.08)', opacity: 1, offset: 0.7 },
    { transform: 'scale(1)', opacity: 1 },
  ], { duration: dur, delay, easing: 'ease-out', fill: 'backwards' });
}

export function fade(e, to, dur = 400) {
  const from = getComputedStyle(e).opacity;
  const a = e.animate([{ opacity: from }, { opacity: to }], { duration: dur, easing: 'ease-in-out', fill: 'forwards' });
  return a.finished.then(() => { e.style.opacity = to; a.cancel(); });
}

// 主人公の「こたえ」のふきだし（○＝はい、×＝やめる）。しっぽは画面の手前（自分）に向ける
//   (x, y) はふきだしの下の中央
export function makeReply(parent, x, y, { onYes, onNo }) {
  const r = el('div', 'reply hidden', parent);
  r.style.left = x + 'px'; r.style.top = y + 'px';
  const yes = el('button', 'reply-yes', r);
  yes.type = 'button'; yes.setAttribute('aria-label', 'はい');
  el('span', 'maru-ring', yes);
  const no = el('button', 'reply-no', r);
  no.type = 'button'; no.setAttribute('aria-label', 'やめる');
  no.innerHTML = '<svg viewBox="0 0 170 170" aria-hidden="true"><path d="M38 38 L132 132 M132 38 L38 132" stroke="currentColor" stroke-width="25" stroke-linecap="round"/></svg>';
  let busy = false;
  const press = (fn, b) => (e) => {
    e.stopPropagation();
    if (busy || r.classList.contains('hidden')) return;
    b.animate([{ transform: 'scale(1)' }, { transform: 'scale(.88)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 300 });
    fn && fn();
  };
  yes.addEventListener('pointerdown', (e) => e.stopPropagation());
  no.addEventListener('pointerdown', (e) => e.stopPropagation());
  yes.addEventListener('click', press(onYes, yes));
  no.addEventListener('click', press(onNo, no));
  return {
    el: r,
    show() {
      busy = false;
      if (!r.classList.contains('hidden')) return;
      r.classList.remove('hidden');
      r.animate([{ transform: 'translate(-50%,-100%) scale(.5)', opacity: 0 }, { transform: 'translate(-50%,-100%) scale(1.05)', opacity: 1, offset: 0.7 }, { transform: 'translate(-50%,-100%) scale(1)', opacity: 1 }],
        { duration: 450, easing: 'ease-out' });
    },
    hide() { r.classList.add('hidden'); },
    lock() { busy = true; },
    get visible() { return !r.classList.contains('hidden'); },
  };
}

// 降る雪（canvas をステージ全体に重ねる）
export function makeSnow(ctx, parent, n = 70) {
  const c = el('canvas', '', parent);
  box(c, 0, 0, 1536, 1024);
  c.width = 768; c.height = 512;
  const g = c.getContext('2d');
  g.scale(0.5, 0.5);
  const R = (a, b) => a + Math.random() * (b - a);
  const flakes = Array.from({ length: n }, () => ({ x: R(0, 1536), y: R(0, 1024), r: R(2, 6), vy: R(0.4, 1.3), ph: R(0, 6.28) }));
  ctx.loop((t) => {
    g.clearRect(0, 0, 1536, 1024);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    flakes.forEach((f) => {
      f.y += f.vy; f.x += Math.sin(t / 1300 + f.ph) * 0.45;
      if (f.y > 1030) { f.y = -10; f.x = R(0, 1536); }
      g.beginPath(); g.arc(f.x, f.y, f.r, 0, Math.PI * 2); g.fill();
    });
  });
  return c;
}
