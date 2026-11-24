// シーン2・3（店内）で共通の配置
import { CAKES } from '../data.js';
import { el, img, box } from '../fx.js';
import { buildCake } from '../cake.js';
import { makeBear } from '../bear.js';

export const CAKE_POS = { cx: 480, bottom: 802, W: 400 };
export const BEAR = { cx: 1130, top: 112, h: 800, clip: 662 }; // clip：カウンターの奥のふち（背景画像で測った線。ここより下はカウンターに隠れる）
export const TRAY = { x: 1130, y: 612 };                       // トレーの中心（カウンターの奥に立っているとき）
// くまのふきだし（顔の左。しっぽは口元へ）
export const BUBBLE = { x: 935, y: 235, side: 'right', to: { x: 1050, y: 300 } };

export function buildShop(ctx, { decos = [] } = {}) {
  const { root, state } = ctx;
  img('bg-shop.jpg', 'bg', root);
  const clip = el('div', 'bear-clip', root);
  clip.style.height = BEAR.clip + 'px';
  const bear = makeBear(clip, { cx: BEAR.cx, top: BEAR.top, h: BEAR.h, poses: ['standing', 'tray', 'secret', 'ribbon'] });
  bear.el.style.transformOrigin = `${BEAR.cx}px ${BEAR.top + BEAR.h}px`;
  const cakeData = CAKES[state.cake];
  // ろうそくはまだ刺さない（シーン4で箱を開けたときに刺す）
  const cake = buildCake(cakeData, CAKE_POS.W, { decos, candle: false });
  root.appendChild(cake.el);
  cake.left = CAKE_POS.cx - cake.W / 2;
  cake.top = CAKE_POS.bottom - cake.H;
  box(cake.el, cake.left, cake.top);
  cake.el.style.zIndex = 20;
  return { bear, cake, cakeData, clip };
}
