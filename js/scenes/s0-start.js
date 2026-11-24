// シーン0：はじまり（大人向け「おうちのひとへ」画面）
import * as audio from '../audio.js';
import { BGM_FILE, CREDITS } from '../data.js';
import { el, img, makeSnow } from '../fx.js';

// ひらがなだけにする。カタカナはひらがなに直し、最後の「ちゃん」は取る。6もじまで
export function cleanName(raw) {
  let s = (raw || '').normalize('NFKC').trim();
  s = s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  s = s.replace(/[^ぁ-ゖー]/g, '');
  s = s.replace(/(ちゃん)+$/, '');
  return [...s].slice(0, 6).join('');
}

const STAR = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 0 L12.4 7.6 L20 10 L12.4 12.4 L10 20 L7.6 12.4 L0 10 L7.6 7.6 Z" fill="currentColor"/></svg>';

export default {
  enter(ctx) {
    const { root, state, params } = ctx;
    img('bg-exterior.jpg', 'bg', root);
    el('div', 's0-veil', root);
    makeSnow(ctx, root, 60);

    // タイトル
    const head = el('div', 's0-head', root);
    el('p', 's0-sub', head).textContent = 'クリスマスの しかけえほん';
    const title = el('h1', 's0-title', head);
    title.innerHTML = '<span>はじめての</span><span>クリスマスケーキ</span>';
    [[-60, 40, 26], [930, 10, 34], [980, 120, 20], [-110, 150, 18]].forEach(([x, y, s], i) => {
      const st = el('span', 's0-twinkle', head);
      st.innerHTML = STAR;
      Object.assign(st.style, { left: x + 'px', top: y + 'px', width: s + 'px', height: s + 'px', animationDelay: (i * 0.45) + 's' });
    });

    // なまえのカード（ケーキ屋さんのタグのような紙）
    const card = el('div', 's0-card', root);
    img('deco-holly.png', 's0-holly', card);
    el('p', 's0-label', card).textContent = 'おなまえ';
    const form = el('div', 's0-form', card);
    const input = el('input', '', form);
    Object.assign(input, { type: 'text', placeholder: 'ひらがなで', autocomplete: 'off', spellcheck: false, maxLength: 12 });
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('lang', 'ja');
    el('span', 's0-chan', form).textContent = 'ちゃん';
    input.value = cleanName(params.get('name') || state.name);

    let composing = false;
    ctx.on(input, 'compositionstart', () => { composing = true; });
    ctx.on(input, 'compositionend', () => { composing = false; });
    ctx.on(input, 'change', () => { if (!composing) input.value = cleanName(input.value); });

    const btn = el('button', 's0-start', card);
    btn.type = 'button';
    btn.innerHTML = `<span class="s0-btn-star">${STAR}</span><span class="s0-btn-text">じゅんびちゅう…</span>`;
    const btnText = btn.querySelector('.s0-btn-text');
    btn.disabled = true;
    ctx.imagesReady.then(() => { if (ctx.alive) { btn.disabled = false; btnText.textContent = 'はじめる'; } });

    const adult = el('div', 's0-adult', card);
    el('h2', '', adult).textContent = 'おうちのひとへ';
    el('p', '', adult).textContent = 'お子さんが はじめて じぶんで クリスマスケーキを えらぶ しかけえほんです。なまえは ひらがな 6もじまで、「ちゃん」は つけずに いれてください（さいごに ケーキの プレートに でてきます。からっぽでも はじめられます）。おとが でます。タブレットは よこむきで どうぞ。';

    el('p', 's0-credits', root).textContent = CREDITS;

    // 入力画面のどこかを最初にさわったときから、BGM を鳴らす
    const firstTouch = (e) => { if (audio.isActivation(e)) audio.startSound(BGM_FILE); };
    ['pointerdown', 'pointerup', 'keydown'].forEach((ev) => ctx.on(document, ev, firstTouch, true));

    let started = false;
    const start = async () => {
      if (started || btn.disabled) return;
      started = true;
      input.blur();
      state.name = cleanName(input.value);
      audio.startSound(BGM_FILE);
      btn.disabled = true;
      await ctx.talk('n01');
      ctx.go(ctx.startTarget());
    };
    ctx.on(btn, 'click', start);
    ctx.on(input, 'keydown', (e) => { if (e.key === 'Enter' && !composing) start(); });
  },
};
