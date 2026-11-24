// シーン1：ショーウィンドウ。曇った窓を指でこすってケーキを見つけ、タップで選ぶ
import * as audio from '../audio.js';
import { CAKES } from '../data.js';
import { el, img, box, sparkle, hop, fade, makeReply, makeSnow } from '../fx.js';
import { makeBear } from '../bear.js';

// 窓ガラスの範囲（背景画像の窓フチの内側）
const GLASS = { x: 303, y: 452, w: 662, h: 304 };
// 窓フチの内側の形（背景画像の座標で、左下 → 左の角 → 上 → 右の角 → 右下）。画像の色から測った
const GLASS_EDGE = [
  [303, 756], [305, 640], [307, 590], [308, 568], [310, 545], [312, 530], [315, 519], [320, 510],
  [326, 501], [333, 491], [341, 482], [351, 474], [364, 468], [378, 464], [393, 460], [410, 457],
  [432, 455], [470, 453], [640, 453], [830, 454], [860, 456], [882, 459], [900, 462], [912, 468],
  [924, 478], [936, 490], [946, 502], [954, 512], [960, 523], [962, 540], [963, 570], [964, 640], [965, 756],
];
const SLOT_W = 136, SHELF_Y = 747;
const CENTERS = [409, 559, 709, 859];
const BRUSH = 50;
const BEAR = { cx: 1352, top: 470, h: 440 };
const BUBBLE = { x: 1240, y: 452, side: 'bottom', to: { x: 1330, y: 540 } };
const REPLY = { x: 1060, y: 1000 };

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

export default {
  enter(ctx) {
    const { root, state } = ctx;
    state.cake = null;
    state.decos = [];
    const bg = img('bg-exterior.jpg', 'bg', root);

    // ケーキ（曇りの奥）
    const cakes = CAKES.map((c, i) => {
      const h = SLOT_W * c.h / c.w;
      const slot = el('div', 'slot', root);
      box(slot, CENTERS[i] - SLOT_W / 2, SHELF_Y - h, SLOT_W, h);
      const im = img(c.src, '', slot);
      return { i, data: c, slot, im, rect: { x: CENTERS[i] - SLOT_W / 2, y: SHELF_Y - h, w: SLOT_W, h }, ready: false };
    });

    // 曇り・水滴
    const fogC = el('canvas', 'fog', root);
    box(fogC, GLASS.x, GLASS.y, GLASS.w, GLASS.h);
    fogC.width = GLASS.w; fogC.height = GLASS.h;
    const fog = fogC.getContext('2d', { willReadFrequently: true });
    const dripC = el('canvas', 'fog', root);
    box(dripC, GLASS.x, GLASS.y, GLASS.w, GLASS.h);
    dripC.width = GLASS.w; dripC.height = GLASS.h;
    const drip = dripC.getContext('2d');
    makeSnow(ctx, root);

    // 絵が読めてから曇りを描く（ガラスの向こうをぼかして写す）
    let fogReady = false;
    Promise.all([bg, ...cakes.map((c) => c.im)].map((i) => (i.decode ? i.decode().catch(() => {}) : null)))
      .then(() => { if (ctx.alive) { drawFog(); fogReady = true; } });

    const bear = makeBear(root, { cx: BEAR.cx, top: BEAR.top, h: BEAR.h, poses: ['standing'] });
    bear.el.style.display = 'none';
    bear.el.style.transformOrigin = `${BEAR.cx}px ${BEAR.top + BEAR.h}px`;
    const reply = makeReply(root, REPLY.x, REPLY.y, { onYes: yes, onNo: no });

    let chosen = null, cleared = false, leaving = false, firstReady = false;
    let wipeHints = 0, idleTimer = null, replyTimer = null, lureTimer = null;

    // ---------- 曇り ----------
    function glassPath(c) {
      // 窓フチの内側をなぞった形（背景画像から測った点。なめらかにつなぐ）
      const pts = GLASS_EDGE.map(([x, y]) => [x - GLASS.x, y - GLASS.y]);
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
        c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      }
      const e = pts[pts.length - 1];
      c.lineTo(e[0], e[1]);
      c.closePath();
    }
    function drawFog() {
      const { w, h } = GLASS;
      // ガラスの向こう（背景とケーキ）をそのまま写した絵。ぼかしに使う
      const scene = document.createElement('canvas');
      scene.width = w; scene.height = h;
      const sc = scene.getContext('2d');
      sc.drawImage(bg, GLASS.x, GLASS.y, w, h, 0, 0, w, h);
      cakes.forEach((c) => sc.drawImage(c.im, c.rect.x - GLASS.x, c.rect.y - GLASS.y, c.rect.w, c.rect.h));
      // 1) 小さくして戻し、強くぼかす（すりガラス越しの光と色）
      const s1 = document.createElement('canvas');
      s1.width = Math.round(w / 14); s1.height = Math.round(h / 14);
      s1.getContext('2d').drawImage(scene, 0, 0, s1.width, s1.height);
      const s2 = document.createElement('canvas');
      s2.width = Math.round(w / 5); s2.height = Math.round(h / 5);
      const b = s2.getContext('2d');
      b.imageSmoothingQuality = 'high';
      b.drawImage(s1, 0, 0, s2.width, s2.height);
      fog.save();
      glassPath(fog); fog.clip();
      fog.imageSmoothingQuality = 'high';
      fog.drawImage(s2, 0, 0, w, h);
      // 2) 白いもや。下とふちほど濃い（冷えたガラスのふちから曇る）
      const g = fog.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(250,247,242,0.55)');
      g.addColorStop(0.55, 'rgba(247,246,246,0.62)');
      g.addColorStop(1, 'rgba(240,242,248,0.82)');
      fog.fillStyle = g; fog.fillRect(0, 0, w, h);
      const v = fog.createRadialGradient(w / 2, h * 0.42, h * 0.25, w / 2, h * 0.42, w * 0.6);
      v.addColorStop(0, 'rgba(255,255,255,0)');
      v.addColorStop(1, 'rgba(244,246,252,0.55)');
      fog.fillStyle = v; fog.fillRect(0, 0, w, h);
      // 3) もやのむら（息を吹きかけたような濃淡）
      for (let i = 0; i < 90; i++) {
        const x = rand(0, w), y = rand(0, h), r = rand(25, 130);
        const rg = fog.createRadialGradient(x, y, 0, x, y, r);
        const c = Math.random() < 0.75 ? '255,255,255' : '226,232,244';
        rg.addColorStop(0, `rgba(${c},${rand(0.05, 0.17)})`);
        rg.addColorStop(1, `rgba(${c},0)`);
        fog.fillStyle = rg; fog.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // 4) とても細かい水滴の粒（すりガラスのざらざら）
      for (let i = 0; i < 9000; i++) {
        const x = rand(0, w), y = rand(0, h);
        fog.fillStyle = Math.random() < 0.6 ? `rgba(255,255,255,${rand(0.25, 0.6)})` : `rgba(120,115,125,${rand(0.05, 0.14)})`;
        fog.fillRect(x, y, rand(0.6, 1.6), rand(0.6, 1.6));
      }
      // 5) 結露の細かい水滴。下のほうほど多い（大きな粒・気泡のような粒は入れない。2026-11-25）
      for (let i = 0; i < 2600; i++) {
        const y = h * Math.pow(Math.random(), 0.55), x = rand(0, w);
        droplet(fog, x, y, rand(0.6, 1.2), 0.55);
      }
      fog.restore();
    }
    // 光を受けた水滴（上が明るく、下に影）
    function droplet(c, x, y, r, a) {
      const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, 0, x, y, r * 1.15);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.55, `rgba(240,242,248,${a * 0.45})`);
      g.addColorStop(0.85, `rgba(150,140,130,${a * 0.22})`);
      g.addColorStop(1, 'rgba(150,140,130,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, r * 1.15, 0, TAU); c.fill();
    }
    function stamp(x, y) {
      fog.save();
      fog.globalCompositeOperation = 'destination-out';
      const g = fog.createRadialGradient(x, y, 0, x, y, BRUSH);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.6, 'rgba(0,0,0,0.95)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      fog.fillStyle = g;
      fog.beginPath(); fog.arc(x, y, BRUSH, 0, TAU); fog.fill();
      fog.restore();
    }
    let last = null, strokeLen = 0, lastSwish = 0, lastCheck = 0, lastSqueak = 0, lastDir = 0, lastT = 0;
    // キュッキュッ：こする向きが変わったとき、または同じ向きにこすり続けたときに鳴らす
    function squeakFor(dx, dy) {
      const t = performance.now();
      const speed = Math.hypot(dx, dy) / Math.max(8, t - lastT) * 16; // 1フレームあたりの移動量くらい
      lastT = t;
      if (speed < 2) return;
      const dir = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 2 * Math.sign(dy);
      const turned = lastDir && dir !== lastDir;
      lastDir = dir;
      if ((turned && t - lastSqueak > 110) || t - lastSqueak > 260) {
        lastSqueak = t;
        audio.se.squeak(Math.min(1, speed / 30));
      }
    }
    function wipeTo(x, y) {
      if (!fogReady) return;
      if (last) {
        squeakFor(x - last.x, y - last.y);
        const d = Math.hypot(x - last.x, y - last.y);
        const steps = Math.max(1, Math.ceil(d / 9));
        for (let k = 1; k <= steps; k++) stamp(last.x + (x - last.x) * k / steps, last.y + (y - last.y) * k / steps);
        strokeLen += d;
        if (strokeLen > 150) { strokeLen = 0; if (Math.random() < 0.7) spawnDrip(x + rand(-25, 25), y + BRUSH * 0.6); }
      } else stamp(x, y);
      last = { x, y };
      const t = performance.now();
      if (t - lastSwish > 160) { lastSwish = t; audio.se.swish(); }
      if (t - lastCheck > 120) { lastCheck = t; checkCakes(); }
    }

    // ケーキがどれだけ見えたか
    function checkCakes() {
      if (cleared || !fogReady) return;
      cakes.forEach((c) => {
        if (c.ready) return;
        const x0 = Math.round(c.rect.x - GLASS.x + c.rect.w * 0.15), y0 = Math.round(c.rect.y - GLASS.y + c.rect.h * 0.15);
        const w = Math.round(c.rect.w * 0.7), h = Math.round(c.rect.h * 0.7);
        const data = fog.getImageData(x0, y0, w, h).data;
        let clear = 0, total = 0;
        for (let i = 3; i < data.length; i += 4 * 3) { total++; if (data[i] < 90) clear++; }
        if (clear / total >= 0.45) makeReady(c, true);
      });
    }
    function makeReady(c, announce) {
      if (c.ready) return;
      c.ready = true;
      c.slot.classList.add('ready');
      hop(c.im);
      sparkle(root, c.rect.x + c.rect.w / 2, c.rect.y + c.rect.h * 0.3, { n: 10, spread: 80 });
      audio.se.sparkle();
      if (announce && !firstReady && !chosen) { firstReady = true; ctx.run(() => ctx.talk('n04')); }
    }

    // ---------- 水滴 ----------
    const drips = [];
    function spawnDrip(x, y) {
      if (drips.length > 16 || y > GLASS.h - 20) return;
      drips.push({ x, y, len: 0, max: rand(50, 220), r: rand(3.5, 6), pause: 0, moving: true, life: 1, t: 0 });
    }
    function updateDrips(now) {
      drip.clearRect(0, 0, GLASS.w, GLASS.h);
      for (let i = drips.length - 1; i >= 0; i--) {
        const d = drips[i];
        if (d.moving) {
          if (d.pause > 0) d.pause--;
          else {
            const v = rand(0.5, 1.9);
            if (Math.random() < 0.025) d.pause = rand(10, 40);
            const nx = d.x + rand(-0.3, 0.3), ny = d.y + v;
            fog.save();
            fog.globalCompositeOperation = 'destination-out';
            fog.lineWidth = d.r * 1.25; fog.lineCap = 'round';
            fog.strokeStyle = 'rgba(0,0,0,0.9)';
            fog.beginPath(); fog.moveTo(d.x, d.y); fog.lineTo(nx, ny); fog.stroke();
            fog.restore();
            d.x = nx; d.y = ny; d.len += v;
            if (d.len > d.max || d.y > GLASS.h - 8) { d.moving = false; d.t = now; }
          }
        } else {
          d.life = 1 - (now - d.t) / 2600;
          if (d.life <= 0) { drips.splice(i, 1); continue; }
        }
        drip.globalAlpha = Math.max(0, d.life);
        droplet(drip, d.x, d.y, d.r, 0.95);
      }
      drip.globalAlpha = 1;
    }
    ctx.loop((t) => updateDrips(t));

    // ---------- 指の動き ----------
    let ptr = null;
    const inGlass = (p) => p.x > GLASS.x - 30 && p.x < GLASS.x + GLASS.w + 30 && p.y > GLASS.y - 30 && p.y < GLASS.y + GLASS.h + 30;
    ctx.on(root, 'pointerdown', (e) => {
      if (leaving || e.target.closest('.reply')) return;
      const p = ctx.toStage(e);
      ptr = { id: e.pointerId, sx: p.x, sy: p.y, t: performance.now(), moved: 0 };
      try { root.setPointerCapture(e.pointerId); } catch (err) { /* なにもしない */ }
      last = null;
      if (!cleared && inGlass(p)) { wipeTo(p.x - GLASS.x, p.y - GLASS.y); resetIdle(); }
    });
    ctx.on(root, 'pointermove', (e) => {
      if (!ptr || e.pointerId !== ptr.id) return;
      const p = ctx.toStage(e);
      ptr.moved = Math.max(ptr.moved, Math.hypot(p.x - ptr.sx, p.y - ptr.sy));
      if (!cleared && inGlass(p)) { wipeTo(p.x - GLASS.x, p.y - GLASS.y); resetIdle(); } else last = null;
    });
    ctx.on(root, 'pointerup', (e) => {
      if (!ptr || e.pointerId !== ptr.id) return;
      const p = ctx.toStage(e);
      const tap = ptr.moved < 18 && performance.now() - ptr.t < 600;
      ptr = null; last = null;
      checkCakes();
      if (tap) onTap(p);
    });
    ctx.on(root, 'pointercancel', () => { ptr = null; last = null; });

    function onTap(p) {
      const c = cakes.find((k) => p.x > k.rect.x - 12 && p.x < k.rect.x + k.rect.w + 12 && p.y > k.rect.y - 20 && p.y < k.rect.y + k.rect.h + 12);
      if (c && c.ready) choose(c);
    }

    // ---------- えらぶ ----------
    let bearShown = false;
    function choose(c) {
      if (leaving) return;
      chosen = c;
      state.cake = c.i;
      cakes.forEach((k) => k.slot.classList.toggle('picked', k === c));
      hop(c.im, { h: 34 });
      sparkle(root, c.rect.x + c.rect.w / 2, c.rect.y + c.rect.h * 0.4, { n: 14, spread: 110 });
      audio.se.pop();
      if (!bearShown) {
        bearShown = true;
        bear.el.style.display = '';
        bear.set('standing', 0);
        bear.el.animate([
          { transform: 'translateX(90px) scale(.85)', opacity: 0 },
          { transform: 'translateX(-10px) scale(1.03)', opacity: 1, offset: 0.7 },
          { transform: 'none', opacity: 1 },
        ], { duration: 650, easing: 'ease-out' });
      }
      ctx.clear(replyTimer);
      ctx.run(async () => {
        await ctx.wait(250);
        reply.show();
        await ctx.talk(c.data.voice, BUBBLE);
        replyTimer = ctx.later(9000, () => { if (chosen) ctx.talk('b04h', BUBBLE); });
      });
    }

    // ○：これにする
    function yes() {
      if (!chosen || leaving) return;
      leaving = true;
      reply.lock();
      ctx.clear(replyTimer);
      sparkle(root, REPLY.x - 70, REPLY.y - 130, { n: 16, spread: 140 });
      audio.se.chime();
      ctx.run(async () => {
        await ctx.talk('b05', BUBBLE);
        ctx.go(2);
      });
    }
    // ×：選びなおす
    function no() {
      if (!chosen || leaving) return;
      ctx.clear(replyTimer);
      audio.stopVoice();
      chosen = null;
      state.cake = null;
      cakes.forEach((k) => k.slot.classList.remove('picked'));
      reply.hide();
      audio.se.pop();
      lureTimer = ctx.later(8000, lure);
    }

    // ---------- つまずき防止 ----------
    function resetIdle() {
      ctx.clear(idleTimer);
      idleTimer = ctx.later(wipeHints === 0 ? 8000 : 12000, hintWipe);
    }
    function hintWipe() {
      if (chosen || cleared || wipeHints >= 2) return;
      wipeHints++;
      ctx.run(() => ctx.talk('n03'));
      demoHand();
      resetIdle();
    }
    function demoHand() {
      const hand = img('mitten.png', 'demo-hand', root);
      const y = GLASS.y + GLASS.h * 0.45;
      const xs = [GLASS.x + 140, GLASS.x + 360, GLASS.x + 180, GLASS.x + 420];
      hand.animate(xs.map((x, i) => ({ transform: `translate(${x}px, ${y + (i % 2) * 30}px)`, opacity: i === 0 ? 0 : 1 }))
        .concat([{ transform: `translate(${xs[3]}px, ${y}px)`, opacity: 0 }]),
      { duration: 2200, easing: 'ease-in-out' }).onfinish = () => hand.remove();
    }
    function clearAll() {
      if (cleared || leaving) return;
      cleared = true;
      fade(fogC, 0, 1600);
      fade(dripC, 0, 1600);
      cakes.forEach((c, i) => ctx.later(500 + i * 220, () => makeReady(c, false)));
      if (!chosen) ctx.later(1600, () => ctx.talk('n05'));
      ctx.clear(lureTimer);
      lureTimer = ctx.later(6000, lure);
    }
    function lure() {
      if (chosen || leaving) return;
      cakes.filter((c) => c.ready).forEach((c, i) => ctx.later(i * 320, () => { hop(c.im); audio.se.pop(); }));
      lureTimer = ctx.later(6500, lure);
    }
    ctx.later(40000, () => { if (!chosen) clearAll(); });
    ctx.hotkeys.c = clearAll;

    ctx.run(async () => {
      await ctx.wait(500);
      await ctx.talk('n02');
      resetIdle();
    });
  },
};
