// シーン2：店内。くまが手前までトレーを差し出し、子どもが自分で飾りをケーキにのせる
//   ・つまんで運ぶ（ドラッグ）でも、タップだけでも、のせられる
//   ・のせた飾りはタップするとトレーに戻る。つまめば置きなおせる
//   ・3個のせると「できあがり？」→ ○ で決定、× でつづける（最初に「みっつまで のせられるよ」と伝える）
import * as audio from '../audio.js';
import { DECOS } from '../data.js';
import { el, img, box, sparkle, hop, popIn, fade, makeReply } from '../fx.js';
import { findSpot, autoTarget, DECO_H } from '../cake.js';
import { buildShop, BEAR, BUBBLE, CAKE_POS } from './shop.js';

// くまが手前に寄ってトレーを差し出したときの動き（足元を中心に拡大して下へ）
const NEAR = { s: 1.8, tx: -30, ty: 458 };
const TRAY_NEAR = { x: 1100, y: 830 };                                // そのときのトレーの中心
const BUBBLE_NEAR = { x: 865, y: 205, side: 'right', to: { x: 985, y: 260 } };
const ITEM_H = 140;
// トレーの上の置き場所（足元の位置。トレー中心からのずれ）
const TRAY_SLOTS = [[-150, -32], [0, -40], [150, -32], [-168, 38], [0, 46], [168, 38]];
const REPLY = { x: 470, y: 1012 };
const MAX = 3;

export default {
  enter(ctx) {
    const { root, state } = ctx;
    state.decos = [];
    const { bear, cake, cakeData, clip } = buildShop(ctx);
    const W = cake.W;
    const decoH = W * DECO_H;
    bear.set('standing', 0);

    const trayLayer = el('div', 'tray-items', root);
    const reply = makeReply(root, REPLY.x, REPLY.y, { onYes: finish, onNo: notYet });
    let busy = true, finished = false, near = false, interacted = false;
    let hintTimer = null, order = 0, g = null;
    const asked = new Set();
    const anchor = () => (near ? BUBBLE_NEAR : BUBBLE);

    // ---------- 飾りの記録 ----------
    const recs = DECOS.map((d, i) => {
      const [ox, oy] = TRAY_SLOTS[i];
      const w = ITEM_H * d.w / d.h;
      const home = { x: TRAY_NEAR.x + ox - w / 2, y: TRAY_NEAR.y + oy - ITEM_H, w, h: ITEM_H };
      const e = el('div', 'deco-item', trayLayer);
      img(d.src, '', e);
      box(e, home.x, home.y, home.w, home.h);
      e.style.zIndex = 60 + oy;
      e.style.visibility = 'hidden';
      e.dataset.rec = i;
      return { d, i, home, trayEl: e, cakeEl: null, spot: null, where: 'tray', order: 0 };
    });
    const onCake = () => recs.filter((r) => r.where === 'cake').sort((a, b) => a.order - b.order);
    const syncState = () => { state.decos = onCake().map((r) => ({ id: r.d.id, fx: r.spot.fx, fy: r.spot.fy })); };
    const cakeRect = (r) => { const b = cake.decoBox(r.d.id, r.spot.fx, r.spot.fy); return { x: cake.left + b.x, y: cake.top + b.y, w: b.w, h: b.h }; };

    // ---------- 飛ばす（一時的な絵を from → to へ） ----------
    function makeFloat(r, rect) {
      const f = img(r.d.src, 'deco-float', root);
      box(f, rect.x, rect.y, rect.w, rect.h);
      return f;
    }
    function fly(f, from, to, { arc = 0, dur = 420 } = {}) {
      box(f, from.x, from.y, from.w, from.h);
      const dx = to.x - from.x, dy = to.y - from.y, s = to.w / from.w;
      const a = f.animate([
        { transform: 'translate(0,0) scale(1)' },
        { transform: `translate(${dx / 2}px, ${dy / 2 - arc}px) scale(${(1 + s) / 2 * (arc ? 1.08 : 1)})`, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
      ], { duration: dur, easing: 'ease-in-out', fill: 'forwards' });
      return a.finished.then(() => f.remove());
    }

    // ---------- のせる・もどす ----------
    function toCake(r, from, f, target, arc, free = false) {
      r.where = 'moving';
      const others = recs.filter((x) => x !== r && (x.where === 'cake' || x.target))
        .map((x) => ({ id: x.d.id, ...(x.where === 'cake' ? x.spot : x.target) }));
      const spot = findSpot(cakeData, W, target, others, r.d.id, { free });
      r.target = spot; // 飛んでいるあいだも、この場所はふさがっている
      const b = cake.decoBox(r.d.id, spot.fx, spot.fy);
      const to = { x: cake.left + b.x, y: cake.top + b.y, w: b.w, h: b.h };
      fly(f, from, to, { arc, dur: arc ? 620 : 300 }).then(() => {
        if (!ctx.alive) return;
        r.target = null;
        r.where = 'cake'; r.spot = spot; r.order = ++order;
        r.cakeEl = cake.addDeco(r.d.id, spot.fx, spot.fy);
        r.cakeEl.classList.add('grab');
        r.cakeEl.dataset.rec = r.i;
        hop(r.cakeEl, { h: 16, dur: 420 });
        sparkle(root, to.x + to.w / 2, to.y + to.h * 0.4, { n: 12, spread: 80 });
        audio.se.pop(); audio.se.sparkle(0.05);
        syncState();
        afterChange(r);
      });
    }
    function toTray(r, from, f, arc) {
      r.where = 'moving';
      fly(f, from, r.home, { arc, dur: arc ? 520 : 360 }).then(() => {
        if (!ctx.alive) return;
        r.where = 'tray';
        r.trayEl.style.visibility = '';
        hop(r.trayEl, { h: 12, dur: 380 });
        audio.se.pop();
        syncState();
        afterChange(null);
      });
    }

    function afterChange(placed) {
      resetHint();
      const n = onCake().length;
      recs.forEach((r) => r.trayEl.classList.toggle('full', n >= MAX));
      if (n < MAX) reply.hide();
      ctx.run(async () => {
        if (placed) await ctx.talk(placed.d.voice, anchor);
        if (finished) return;
        const now = onCake().length;
        if (now >= MAX) {
          reply.show();
          if (!asked.has(now) && placed) { asked.add(now); await ctx.talk('b22', anchor); }
        }
      });
    }

    // ---------- 指の動き（ステージ全体で受ける） ----------
    ctx.on(root, 'pointerdown', (e) => {
      if (busy || finished || g) return;
      const t = e.target.closest('[data-rec]');
      if (!t) return;
      const r = recs[+t.dataset.rec];
      if (r.where !== 'tray' && r.where !== 'cake') return;
      const used = recs.filter((x) => x.where === 'cake' || x.target).length; // 飛んでいる途中のものも数える
      if (r.where === 'tray' && used >= MAX) { nudge(r); return; }
      interacted = true;
      const p = ctx.toStage(e);
      g = { r, id: e.pointerId, sx: p.x, sy: p.y, p, moved: 0, dragging: false, from: r.where };
      try { root.setPointerCapture(e.pointerId); } catch (err) { /* なにもしない */ }
      audio.se.pop();
    });
    ctx.on(root, 'pointermove', (e) => {
      if (!g || e.pointerId !== g.id) return;
      const p = ctx.toStage(e);
      g.p = p;
      g.moved = Math.max(g.moved, Math.hypot(p.x - g.sx, p.y - g.sy));
      if (!g.dragging && g.moved > 10) startDrag(p);
      if (g.dragging) moveDrag(p);
    });
    const end = (e, cancelled) => {
      if (!g || (e.pointerId !== undefined && e.pointerId !== g.id)) return;
      const cur = g; g = null;
      const p = cancelled ? cur.p : ctx.toStage(e);
      const r = cur.r;
      if (cur.dragging) {
        const base = { x: p.x, y: p.y + decoH / 2 };
        const local = { x: base.x - cake.left, y: base.y - cake.top };
        // ケーキの上（まわりも少し広めに）で離したら、かならずのせる。飾りの絵がケーキに重なっていてもよい
        const fl = { x: base.x - cur.fw / 2, y: base.y - cur.fh, w: cur.fw, h: cur.fh };
        const ox = Math.min(fl.x + fl.w, cake.left + W) - Math.max(fl.x, cake.left);
        const oy = Math.min(fl.y + fl.h, cake.top + cake.H) - Math.max(fl.y, cake.top);
        const overlap = ox > 0 && oy > 0 && (ox * oy) / (fl.w * fl.h) > 0.25;
        const near = p.x > cake.left - 70 && p.x < cake.left + W + 70 && p.y > cake.top - 150 && p.y < cake.top + cake.H + 40;
        const over = near || overlap;
        const from = { x: base.x - cur.fw / 2, y: base.y - cur.fh, w: cur.fw, h: cur.fh };
        if (over) toCake(r, from, cur.float, local, 30, true);
        else toTray(r, from, cur.float, 40);
        return;
      }
      if (cancelled) return;
      // タップ
      if (r.where === 'tray') {
        r.trayEl.style.visibility = 'hidden';
        const f = makeFloat(r, r.home);
        const used = recs.filter((x) => x.where === 'cake' || x.target).length;
        toCake(r, r.home, f, autoTarget(cakeData, W, used), 170);
      } else if (r.where === 'cake') {
        const from = cakeRect(r);
        r.cakeEl.remove(); r.cakeEl = null;
        syncState();
        const f = makeFloat(r, from);
        toTray(r, from, f, 120);
      }
    };
    ctx.on(root, 'pointerup', (e) => end(e, false));
    ctx.on(root, 'pointercancel', (e) => end(e, true));
    ctx.on(root, 'lostpointercapture', (e) => { if (g && g.dragging) end(e, true); else if (g) g = null; });

    function startDrag(p) {
      const r = g.r;
      g.dragging = true;
      const w = decoH * r.d.w / r.d.h;
      g.fw = w; g.fh = decoH;
      if (r.where === 'tray') r.trayEl.style.visibility = 'hidden';
      else { r.cakeEl.remove(); r.cakeEl = null; syncState(); }
      r.where = 'moving';
      g.float = img(r.d.src, 'deco-float lifted', root);
      box(g.float, p.x - w / 2, p.y - decoH / 2, w, decoH);
    }
    function moveDrag(p) {
      box(g.float, p.x - g.fw / 2, p.y - g.fh / 2);
    }
    // もう3つのっているとき：ふるふる
    function nudge(r) {
      r.trayEl.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 300 });
    }

    // ---------- できあがり ----------
    function finish() {
      if (finished || onCake().length < MAX || g) return;
      finished = true; busy = true;
      reply.lock();
      ctx.clear(hintTimer);
      sparkle(root, REPLY.x - 70, REPLY.y - 130, { n: 14, spread: 120 });
      recs.filter((r) => r.where === 'tray').forEach((r) => fade(r.trayEl, 0, 400));
      ctx.run(async () => {
        audio.se.chime();
        sparkle(root, CAKE_POS.cx, CAKE_POS.bottom - cake.H * 0.6, { n: 24, spread: 220, size: 34 });
        await ctx.wait(300);
        reply.hide();
        await stepBack();
        await ctx.talk('b15', anchor);
        await ctx.wait(300);
        ctx.go(3, { fade: false });
      });
    }
    function notYet() {
      if (finished) return;
      reply.hide();
      audio.se.pop();
    }

    // くまが手前に来る／もどる
    // 奥（カウンターで下半身が隠れた姿）と手前（大きな姿）は、動かしてつながず、ディゾルブで入れかえる。
    // 隠れている線を広げながら大きくすると、上半身だけが浮いて見える瞬間ができて怖いため（2026-11-25）
    const NEAR_T = (s) => `translate(${NEAR.tx}px, ${NEAR.ty}px) scale(${s})`;
    function dissolveBear(toNear, pose, dur) {
      // いまの姿を写した絵を、本物のうしろに置く
      const ghost = clip.cloneNode(true);
      ghost.getAnimations?.().forEach((a) => a.cancel());
      ghost.style.height = (toNear ? BEAR.clip : 1024) + 'px';
      const gb = ghost.firstElementChild;
      gb.style.transform = toNear ? 'none' : NEAR_T(NEAR.s);
      const names = Object.keys(bear.imgs);
      [...gb.children].forEach((e, i) => { e.style.opacity = names[i] === bear.pose ? 1 : 0; });
      clip.before(ghost);
      // 本物は、行き先の姿にすぐ切りかえてから、ふわっと浮かび上がらせる
      [clip, bear.el].forEach((e) => e.getAnimations().forEach((a) => a.cancel()));
      bear.set(pose, 0);
      clip.style.height = (toNear ? 1024 : BEAR.clip) + 'px';
      const end = toNear ? NEAR_T(NEAR.s) : 'none';
      const start = toNear ? NEAR_T(NEAR.s * 0.94) : 'translate(0px, 6px) scale(1.03)';
      bear.el.style.transform = end;
      bear.el.animate([{ transform: start }, { transform: end }], { duration: dur, easing: 'cubic-bezier(.3,.6,.3,1)' });
      ghost.animate([{ opacity: 1 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: dur, easing: 'ease-in', fill: 'forwards' })
        .finished.then(() => ghost.remove(), () => ghost.remove());
      return clip.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, easing: 'ease-out' }).finished.catch(() => {});
    }
    function comeNear() {
      near = true;
      return dissolveBear(true, 'tray', 900);
    }
    function stepBack() {
      near = false;
      return dissolveBear(false, bear.pose, 800);
    }

    // ---------- 手助け ----------
    function resetHint() {
      ctx.clear(hintTimer);
      hintTimer = ctx.later(14000, hint);
    }
    function hint() {
      if (finished || g) return;
      ctx.run(() => ctx.talk('b08', anchor));
      recs.filter((r) => r.where === 'tray').forEach((r, i) => ctx.later(i * 250, () => hop(r.trayEl, { h: 18 })));
      audio.se.sparkle();
      if (onCake().length === 0) demo();
      resetHint();
    }
    // ミトンの手が「トレー → ケーキ」のお手本を見せる
    function demo() {
      const r = recs.find((x) => x.where === 'tray');
      if (!r) return;
      const from = { x: r.home.x + r.home.w / 2, y: r.home.y + r.home.h / 2 };
      const to = { x: CAKE_POS.cx + 40, y: CAKE_POS.bottom - cake.H * 0.75 };
      const ghost = img(r.d.src, 'abs', root, { width: r.home.w + 'px', height: r.home.h + 'px', left: 0, top: 0, opacity: 0.75, zIndex: 74 });
      const hand = img('mitten.png', 'demo-hand', root);
      const kf = (dx, dy) => [
        { transform: `translate(${from.x + dx}px, ${from.y + dy}px)`, opacity: 0 },
        { transform: `translate(${from.x + dx}px, ${from.y + dy}px)`, opacity: 1, offset: 0.15 },
        { transform: `translate(${to.x + dx}px, ${to.y + dy}px)`, opacity: 1, offset: 0.8 },
        { transform: `translate(${to.x + dx}px, ${to.y + dy}px)`, opacity: 0 },
      ];
      const opt = { duration: 2000, easing: 'ease-in-out', iterations: 2 };
      ghost.animate(kf(-r.home.w / 2, -r.home.h / 2), opt).onfinish = () => ghost.remove();
      hand.animate(kf(-14, -8), opt).onfinish = () => hand.remove();
    }

    // ---------- 流れ ----------
    ctx.run(async () => {
      audio.se.bell();
      popIn(cake.el, { dur: 500 });
      await ctx.wait(900);
      await ctx.talk('b06', anchor);
      await comeNear();
      recs.forEach((r, i) => ctx.later(i * 110, () => {
        r.trayEl.style.visibility = '';
        popIn(r.trayEl, { dur: 380 });
        sparkle(root, r.home.x + r.home.w / 2, r.home.y + r.home.h / 2, { n: 4, spread: 40, size: 18 });
      }));
      audio.se.sparkle(0.2);
      await ctx.wait(700);
      busy = false;
      await ctx.talk('b07', anchor);
      await ctx.talk('b23', anchor); // みっつまで のせられるよ
      if (!interacted) {
        hintTimer = ctx.later(3500, () => {
          if (interacted || finished) return;
          demo();
          ctx.run(() => ctx.talk('b21', anchor));
          resetHint();
        });
      } else resetHint();
    });
  },
};
