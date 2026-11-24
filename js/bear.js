// 店員のくま。ポーズを重ねて置き、ふわっと切りかえる
import { BEAR_POSES } from './data.js';
import { el, img, box } from './fx.js';

export function makeBear(parent, { cx, top, h, poses }) {
  const wrap = el('div', 'bear', parent);
  const imgs = {};
  poses.forEach((name) => {
    const p = BEAR_POSES[name];
    const w = h * p.w / p.h;
    const e = img(p.src, 'bear-pose', wrap);
    box(e, cx - p.ax * w, top, w, h);
    e.style.opacity = 0;
    imgs[name] = e;
  });
  let current = null;
  return {
    el: wrap,
    imgs,
    get pose() { return current; },
    set(name, dur = 350) {
      if (current === name) return;
      const prev = current ? imgs[current] : null;
      const next = imgs[name];
      current = name;
      if (dur === 0) {
        // 前の切りかえの動き（fill: forwards）が残っていると、すぐ切りかえても上書きされるので止める
        [prev, next].forEach((e) => e && e.getAnimations().forEach((a) => a.cancel()));
        if (prev) prev.style.opacity = 0;
        next.style.opacity = 1;
        return;
      }
      next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, fill: 'forwards' })
        .finished.then(() => { next.style.opacity = 1; });
      if (prev) prev.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, fill: 'forwards' })
        .finished.then(() => { prev.style.opacity = 0; });
    },
  };
}
