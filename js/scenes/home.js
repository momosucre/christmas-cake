// シーン4・5（おうち）で共通の配置
import { CAKES } from '../data.js';
import { img, box } from '../fx.js';
import { buildCake } from '../cake.js';

export const CAKE_POS = { cx: 768, bottom: 778, W: 500 };

export function buildHome(ctx, parent, { plate = false, candle = true } = {}) {
  const { state } = ctx;
  img('bg-living.jpg', 'bg', parent);
  // 白いケーキ皿（ケーキの下に敷く）
  // お皿のだ円の中心を、ケーキの底のだ円の中心にそろえる
  const dw = CAKE_POS.W * 1.32, dh = dw * 428 / 760;
  const dish = img('cake-plate.png', 'abs', parent);
  box(dish, CAKE_POS.cx - dw / 2, CAKE_POS.bottom - CAKE_POS.W * 0.17 - dh / 2, dw, dh);
  dish.style.zIndex = 19;
  const cake = buildCake(CAKES[state.cake], CAKE_POS.W, { decos: state.decos, plate, candle, name: state.name });
  parent.appendChild(cake.el);
  cake.left = CAKE_POS.cx - cake.W / 2;
  cake.top = CAKE_POS.bottom - cake.H;
  box(cake.el, cake.left, cake.top);
  cake.el.style.zIndex = 20;
  cake.dish = dish;
  return cake;
}
