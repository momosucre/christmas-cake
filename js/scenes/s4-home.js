// シーン4：おうち。箱を開けると、選んだケーキと飾り
import * as audio from '../audio.js';
import { img, box, sparkle, hop } from '../fx.js';
import { buildHome, CAKE_POS } from './home.js';

const BOX_W = 560;

export default {
  enter(ctx) {
    const { root } = ctx;
    const cake = buildHome(ctx, root, { candle: false });
    cake.el.style.opacity = 0;
    cake.dish.style.opacity = 0;

    const bh = BOX_W * 604 / 640;
    const boxEl = img('box.png', 'abs', root);
    box(boxEl, CAKE_POS.cx - BOX_W / 2, CAKE_POS.bottom + 20 - bh, BOX_W, bh);
    Object.assign(boxEl.style, { zIndex: 30, pointerEvents: 'auto', transformOrigin: '50% 100%', touchAction: 'none' });

    let opened = false, hintTimer = null;
    const hint = () => {
      if (opened) return;
      hop(boxEl, { h: 18 });
      sparkle(root, CAKE_POS.cx, CAKE_POS.bottom - bh * 0.7, { n: 8, spread: 120 });
      audio.se.sparkle();
      ctx.run(() => ctx.talk('n07'));
      hintTimer = ctx.later(12000, hint);
    };

    ctx.on(boxEl, 'pointerup', () => {
      if (opened) return;
      opened = true;
      ctx.clear(hintTimer);
      audio.se.boxOpen();
      boxEl.animate([
        { transform: 'none', opacity: 1 },
        { transform: 'translateY(-36px) rotate(-3deg)', opacity: 1, offset: 0.25 },
        { transform: 'translateY(-900px) rotate(-12deg)', opacity: 0 },
      ], { duration: 1400, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' });
      cake.el.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 900, delay: 350, easing: 'ease-out', fill: 'forwards' }).finished.then(() => { cake.el.style.opacity = 1; });
      cake.dish.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 350, easing: 'ease-out', fill: 'forwards' })
        .finished.then(() => { cake.dish.style.opacity = 1; });
      ctx.later(500, () => {
        sparkle(root, CAKE_POS.cx, CAKE_POS.bottom - cake.H * 0.5, { n: 26, spread: 260, size: 34 });
        audio.se.chime();
      });
      ctx.run(async () => {
        await ctx.wait(1300);
        await ctx.talk('n08');
        // ろうそくを、上からすっと刺す
        cake.candle.style.display = '';
        cake.candle.animate([
          { transform: 'translateY(-160px)', opacity: 0 },
          { transform: 'translateY(-160px)', opacity: 1, offset: 0.25 },
          { transform: 'translateY(6px)', opacity: 1, offset: 0.8 },
          { transform: 'translateY(0)', opacity: 1 },
        ], { duration: 900, easing: 'ease-in' });
        ctx.later(700, () => {
          audio.se.pop();
          sparkle(root, cake.left + cake.wick.x, cake.top + cake.wick.y + 60, { n: 10, spread: 70 });
        });
        await ctx.wait(1800);
        ctx.go(5, { fade: false });
      });
    });

    ctx.run(async () => {
      await ctx.wait(500);
      await ctx.talk('n06');
      hintTimer = ctx.later(8000, hint);
    });
  },
};
