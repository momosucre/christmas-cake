// シーン5：クライマックス。暗くなる → ろうそくに火 → 名前入りのチョコプレートが浮かぶ → 読み上げ
import * as audio from '../audio.js';
import { CREDITS } from '../data.js';
import { el, sparkle, fade } from '../fx.js';
import { buildHome, CAKE_POS } from './home.js';

const ZOOM = 1.45;
const FOCUS = { x: 768, y: 390 }; // ズームの中心（ろうそくの炎が上の文字にかからない高さ）
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export default {
  enter(ctx) {
    const { root, state } = ctx;
    ctx.narratorBottom(true); // ろうそくの炎にふきだしがかからないように
    const cam = el('div', 'cam', root);
    const cake = buildHome(ctx, cam, { plate: true });
    cake.plate.style.opacity = 0;
    const letters = cake.setPlateText(state.name);
    letters.forEach((s) => { s.style.opacity = 0; });

    const dark = el('div', 'dark', root);
    const warm = el('div', 'warm', root);

    // ろうそくの芯の位置（ズーム後のステージ座標）
    const wickLocal = { x: cake.left + cake.wick.x, y: cake.top + cake.wick.y };
    const zoomed = (p, z) => ({ x: FOCUS.x + (p.x - FOCUS.x) * z, y: FOCUS.y + (p.y - FOCUS.y) * z });
    const wick = zoomed(wickLocal, ZOOM);

    let light = { a0: 0.55, r0: 36, r1: 170 };
    const paintDark = () => {
      dark.style.background = `radial-gradient(circle at ${wick.x}px ${wick.y + 30}px, rgba(10,12,34,${light.a0}) 0px, rgba(10,12,34,${light.a0}) ${light.r0}px, rgba(10,12,34,0.9) ${light.r1}px)`;
    };
    paintDark();
    warm.style.background = `radial-gradient(circle at ${wick.x}px ${wick.y}px, rgba(255,170,70,.55) 0px, rgba(255,150,60,.2) 260px, rgba(255,140,60,0) 560px)`;

    const tap = el('div', 'tap-zone hidden', root);
    Object.assign(tap.style, { left: (wick.x - 110) + 'px', top: (wick.y - 90) + 'px', width: '220px', height: '300px', borderRadius: '60px' });
    const twinkle = el('div', 'twinkle hidden', root);
    Object.assign(twinkle.style, { left: wick.x + 'px', top: (wick.y - 20) + 'px' });

    let lit = false, hintTimer = null;

    function animateLight(to, dur) {
      const from = { ...light };
      const t0 = performance.now();
      return new Promise((res) => {
        const step = (t) => {
          if (!ctx.alive) return;
          const k = Math.min(1, (t - t0) / dur), e = easeInOut(k);
          light = { a0: from.a0 + (to.a0 - from.a0) * e, r0: from.r0 + (to.r0 - from.r0) * e, r1: from.r1 + (to.r1 - from.r1) * e };
          paintDark();
          if (k < 1) requestAnimationFrame(step); else res();
        };
        requestAnimationFrame(step);
      });
    }

    const hint = () => {
      if (lit) return;
      ctx.run(() => ctx.talk('n10'));
      sparkle(root, wick.x, wick.y - 10, { n: 6, spread: 50, size: 20 });
      hintTimer = ctx.later(12000, hint);
    };

    ctx.on(tap, 'pointerup', () => {
      if (lit) return;
      lit = true;
      ctx.clear(hintTimer);
      tap.classList.add('hidden');
      twinkle.classList.add('hidden');
      audio.se.match();
      ctx.run(climax);
    });

    async function climax() {
      await ctx.wait(250);
      // 炎
      const flame = el('div', 'flame', root);
      Object.assign(flame.style, { left: wick.x + 'px', top: wick.y + 'px' });
      ['glow', 'base', 'core'].forEach((c) => el('div', c, flame));
      flame.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.2)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }],
        { duration: 700, easing: 'ease-out' });
      fade(warm, 1, 2200);
      await animateLight({ a0: 0, r0: 240, r1: 760 }, 2600);
      // プレートが浮かび上がる
      cake.plate.animate([
        { opacity: 0, filter: 'blur(8px) brightness(1.6)' },
        { opacity: 1, filter: 'blur(0px) brightness(1)' },
      ], { duration: 2200, easing: 'ease-out', fill: 'forwards' });
      const pr = cake.plate.getBoundingClientRect(), sr = root.getBoundingClientRect(), k = sr.width / 1536;
      const pc = { x: (pr.left - sr.left + pr.width / 2) / k, y: (pr.top - sr.top + pr.height / 2) / k };
      ctx.later(600, () => { sparkle(root, pc.x, pc.y, { n: 16, spread: 140 }); audio.se.sparkle(); });
      await ctx.wait(2100);
      await ctx.talk('n11');
      // 文字が1つずつ
      letters.forEach((s, i) => {
        s.animate([{ opacity: 0, transform: 'translateY(6px)', filter: 'blur(3px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
          { duration: 500, delay: i * 120, easing: 'ease-out', fill: 'forwards' });
      });
      audio.se.sparkle(0.2);
      await ctx.wait(letters.length * 120 + 700);
      // 名前はプレートの文字で見せ、声は VOICEVOX の「メリークリスマス」（f02）に統一する（2026-11-25 決定）
      await ctx.talk('f02');
      audio.fadeInBGM(3);
      starShower();
      await ctx.wait(2500);
      ending();
    }

    function starShower() {
      let n = 0;
      const tick = () => {
        if (n++ > 14) return;
        sparkle(root, 200 + Math.random() * 1136, 120 + Math.random() * 500, { n: 5, spread: 70, size: 24 });
        ctx.later(380, tick);
      };
      tick();
    }

    function ending() {
      const end = el('div', 'ending', root);
      el('p', 'credits', end).textContent = CREDITS;
      const btn = el('button', 'replay', end);
      btn.type = 'button';
      btn.setAttribute('aria-label', 'もういっかい');
      btn.innerHTML = '<svg viewBox="0 0 64 64" width="82" height="82" aria-hidden="true"><path d="M50 32a18 18 0 1 1-6-13.4" fill="none" stroke="#d9573f" stroke-width="8" stroke-linecap="round"/><path d="M46 8v14H32" fill="none" stroke="#d9573f" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      end.style.opacity = 0;
      fade(end, 1, 800);
      ctx.on(btn, 'click', () => {
        audio.se.pop();
        state.cake = null; state.decos = [];
        ctx.go(1);
      });
      ctx.run(() => ctx.talk('n12'));
    }

    ctx.run(async () => {
      await ctx.wait(400);
      await ctx.talk('n09');
      audio.fadeOutBGM(2.5);
      audio.se.lightsOff();
      cam.style.transformOrigin = `${FOCUS.x}px ${FOCUS.y}px`;
      cam.animate([{ transform: 'scale(1)' }, { transform: `scale(${ZOOM})` }], { duration: 2400, easing: 'ease-in-out', fill: 'forwards' });
      await fade(dark, 1, 2000);
      tap.classList.remove('hidden');
      twinkle.classList.remove('hidden');
      hintTimer = ctx.later(8000, hint);
    });
  },
};
