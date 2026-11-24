// シーン3：箱詰め。くまがケーキを受け取り、こっそり何かを入れて、箱を渡してくれる
import * as audio from '../audio.js';
import { el, sparkle, hop, fade } from '../fx.js';
import { buildShop, TRAY, BUBBLE, BEAR } from './shop.js';

// 背中を向けたときのふきだし（しっぽは頭の方へ）
const BUBBLE_BACK = { x: 905, y: 235, side: 'right', to: { x: 1020, y: 250 } };

export default {
  enter(ctx) {
    const { root, state } = ctx;
    const { bear, cake } = buildShop(ctx, { decos: state.decos });
    bear.set('tray', 0);

    // 箱を受け取る場所（リボンの箱のあたり）
    const zone = el('div', 'tap-zone hidden', root);
    Object.assign(zone.style, { left: (BEAR.cx - 170) + 'px', top: '410px', width: '340px', height: '262px', borderRadius: '40px' });
    let done = false, lureTimer = null;

    const take = () => {
      if (done) return;
      done = true;
      ctx.clear(lureTimer);
      audio.se.pop(); audio.se.chime(0.1);
      sparkle(root, BEAR.cx, 540, { n: 20, spread: 160, size: 30 });
      ctx.run(async () => { await ctx.wait(700); ctx.go(4); });
    };
    ctx.on(zone, 'pointerup', take);

    function lure() {
      if (done) return;
      hop(bear.imgs.ribbon, { h: 14, dur: 600 });
      sparkle(root, BEAR.cx, 530, { n: 8, spread: 90 });
      audio.se.sparkle();
      lureTimer = ctx.later(6000, lure);
    }

    ctx.run(async () => {
      await ctx.wait(500);
      // ケーキをトレーへ
      const tx = TRAY.x - (cake.left + cake.W / 2);
      const ty = TRAY.y + 10 - (cake.top + cake.H);
      const a = cake.el.animate([
        { transform: 'none' },
        { transform: `translate(${tx * 0.5}px, ${ty * 0.5 - 90}px) scale(.75)`, offset: 0.5 },
        { transform: `translate(${tx}px, ${ty}px) scale(.5)` },
      ], { duration: 1200, easing: 'ease-in-out', fill: 'forwards' });
      await a.finished;
      if (!ctx.alive) return;
      await ctx.talk('b16', BUBBLE);
      await ctx.talk('b17', BUBBLE);
      // 背中を向けて、ないしょ
      fade(cake.el, 0, 350);
      bear.set('secret', 450);
      await ctx.wait(500);
      sparkle(root, BEAR.cx + 230, 410, { n: 8, spread: 60, size: 20 });
      audio.se.sparkle();
      await ctx.talk('b18', BUBBLE_BACK);
      audio.se.boxClose();
      await ctx.wait(400);
      bear.set('ribbon', 450);
      await ctx.wait(500);
      await ctx.talk('b19', BUBBLE);
      zone.classList.remove('hidden');
      lure();
      ctx.later(20000, take);
    });
  },
};
