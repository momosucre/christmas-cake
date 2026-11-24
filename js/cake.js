// ケーキ（本体＋ろうそく＋飾り＋チョコプレート）をひとまとまりで作る
import { DECOS } from './data.js';
import { el, img, box } from './fx.js';

export const DECO_H = 0.27;   // 飾りの高さ（ケーキの幅に対する割合）
const CANDLE_H = 0.4;
const PLATE_W = 0.34;

export function buildCake(cake, W, { decos = [], candle = true, plate = false, name = '' } = {}) {
  const H = W * cake.h / cake.w;
  const root = el('div', 'cake');
  box(root, 0, 0, W, H);
  img(cake.src, 'cake-img', root);
  const api = { el: root, cake, W, H };

  // ろうそく（candle:false でも場所は空けておく）
  {
    const ch = W * CANDLE_H, cw = ch * 70 / 420;
    const bx = cake.candle.x * W, by = cake.candle.y * H;
    api.candle = img('candle.png', 'cake-part candle', root);
    box(api.candle, bx - cw / 2, by - ch, cw, ch);
    api.candle.style.zIndex = Math.round(by);
    api.wick = { x: bx, y: by - ch + ch * 0.015 };
    if (!candle) api.candle.style.display = 'none';
  }

  // チョコプレート：足元をケーキの上に立てる。下を切らずに全部見せる（2026-11-25。文字はコードで書く）
  const pw = W * (cake.plate.w || PLATE_W), ph = pw * 318 / 520;
  const px = cake.plate.x * W, py = cake.plate.y * H;
  const p = el('div', 'plate', root);
  box(p, px - pw / 2, py - ph, pw, ph);
  p.style.zIndex = Math.round(py);
  img('plate.png', '', p);
  const text = el('div', 'plate-text', p);
  text.style.fontSize = (pw * 0.092) + 'px';
  api.plate = p;
  api.setPlateText = (nm) => {
    text.innerHTML = '';
    const lines = nm ? ['メリークリスマス', `${nm}ちゃん`] : ['メリー', 'クリスマス'];
    const base = pw * 0.092;
    lines.forEach((line, li) => {
      const row = el('div', 'plate-line', text);
      // 2行目（名前）は大きく。ただしプレートの幅に収まるように縮める
      if (li === 1) row.style.fontSize = Math.min(1.35, (pw * 0.78) / ([...line].length * base)) + 'em';
      [...line].forEach((ch) => { el('span', '', row).textContent = ch; });
    });
    return [...text.querySelectorAll('span')];
  };
  api.setPlateText(name);
  if (!plate) p.style.display = 'none';

  // 飾り
  api.addDeco = (id, fx, fy) => {
    const d = DECOS.find((x) => x.id === id);
    const h = W * DECO_H, w = h * d.w / d.h;
    const bx = fx * W, by = fy * H;
    const e = img(d.src, 'cake-part deco', root);
    box(e, bx - w / 2, by - h, w, h);
    e.style.zIndex = Math.round(by) + 1;
    e.dataset.deco = id;
    return e;
  };
  // 飾りの絵の、ステージ上の四角（ケーキの左上 left/top を足して使う）
  api.decoBox = (id, fx, fy) => {
    const d = DECOS.find((x) => x.id === id);
    const h = W * DECO_H, w = h * d.w / d.h;
    return { x: fx * W - w / 2, y: fy * H - h, w, h };
  };
  decos.forEach((d) => api.addDeco(d.id, d.fx, d.fy));
  return api;
}

const decoW = (id, W) => { const d = DECOS.find((x) => x.id === id); return W * DECO_H * d.w / d.h; };

// 飾りを置ける場所をさがす（target はケーキ左上からの px）。置いた場所に近い、空いている所を返す
//   placed：すでにのっている飾り [{ id, fx, fy }]　／　id：これから置く飾り
//   飾りどうしは、絵の幅に合わせて横にずらす（大きなひいらぎの後ろに小さなサンタが隠れないように）
//   free：自分の手で置くとき。ほかの飾りとの間はあけず、プレートの前とろうそく以外なら好きな所に置く
//   プレートの後ろ（左右の間）にも置ける。プレートの前だけは、文字を隠すので置かない（2026-11-25）
export function findSpot(cake, W, target, placed, id, { free = false } = {}) {
  const H = W * cake.h / cake.w;
  const t = cake.top;
  const cx = t.cx * W, cy = t.cy * H, rx = t.rx * W, ry = t.ry * H;
  const candle = { x: cake.candle.x * W, y: cake.candle.y * H, r: 0.1 * W };
  // 立てたプレートの前には置かない（文字が隠れる）。後ろは置いてよい（ろうそくのまわりだけは空ける）
  const plate = { x: cake.plate.x * W, y: cake.plate.y * H, hw: (cake.plate.w || PLATE_W) / 2 * W, back: 0.02 * W, front: 0.4 * W };
  const myHalf = (id ? decoW(id, W) : 0.25 * W) * (free ? 0.2 : 0.36); // 飾りの絵がプレートにかぶらない幅
  const myW = id ? decoW(id, W) : 0.25 * W;
  // 横に必要な間（ふたつの絵の幅の平均の 0.62 倍）
  const others = placed.map((p) => ({ x: p.fx * W, y: p.fy * H, need: 0.62 * (myW + (p.id ? decoW(p.id, W) : 0.25 * W)) / 2 }));
  const minGap = 1;
  let best = null, bestD = Infinity, loose = null, looseScore = -Infinity;
  for (let i = 0; i <= 28; i++) {
    for (let j = 0; j <= 14; j++) {
      const x = cx + rx * (-1 + (2 * i) / 28), y = cy + ry * (-1 + (2 * j) / 14);
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
      if (Math.hypot(x - candle.x, y - candle.y) < candle.r) continue;
      if (plate && Math.abs(x - plate.x) < plate.hw + myHalf && y > plate.y - plate.back && y < plate.y + plate.front) continue;
      // gap：いちばん窮屈な相手との「横の間 ÷ 必要な間」＋「前後の差」（1 以上なら重なりすぎない）
      // 前後の差は少しだけ数える（真うしろに重ねると、手前の飾りが奥の飾りを隠してしまう）
      const gap = others.length ? Math.min(...others.map((o) => Math.abs(x - o.x) / o.need + Math.abs(y - o.y) / (0.35 * W))) : Infinity;
      const d = Math.hypot(x - target.x, y - target.y);
      if (gap >= (free ? 0.45 : minGap)) { // 自分で置くときは、少し重なってもよい（真後ろに隠れるほどは重ねない）
        if (d < bestD) { bestD = d; best = { x, y }; }
      } else if (gap - d * 0.05 > looseScore) {
        looseScore = gap - d * 0.05; loose = { x, y };
      }
    }
  }
  const p = best || loose || { x: cx, y: cy };
  return { fx: p.x / W, fy: p.y / H };
}

// タップだけで置くときの「置きたい場所」（左右交互）
export function autoTarget(cake, W, count) {
  const H = W * cake.h / cake.w, t = cake.top;
  const side = [-1, 1, 0][count % 3];
  // 3つめは、プレートの後ろ（ろうそくのとなりの、いちばん奥。プレートの上から顔が出るように）
  if (side === 0) return { x: (t.cx - t.rx * 0.3) * W, y: (t.cy - t.ry * 0.95) * H };
  return { x: (t.cx + t.rx * 0.8 * side) * W, y: (t.cy + t.ry * 0.2) * H };
}
